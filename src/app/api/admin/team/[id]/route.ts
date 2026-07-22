import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {parseTeamUpdateInput} from '@/lib/admin-team';
import {toAdminRole} from '@/lib/admin-auth';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

function forbidden() {
  return NextResponse.json({error: 'Owner access is required to manage the team.'}, {status: 403});
}

async function requireOwner() {
  const owner = await getVerifiedAdmin();
  return owner?.role === 'Owner' ? owner : null;
}

export async function PUT(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const {id} = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({error: 'Invalid team-member ID.'}, {status: 400});
  }

  try {
    const input = parseTeamUpdateInput(await request.json());
    const admin = getSupabaseAdminClient();
    const {data: current, error: currentError} = await admin.from('akl_profiles').select('full_name,role,status').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({error: 'Team member not found.'}, {status: 404});
    if (toAdminRole(current.role) === 'Owner' || id === owner.id) {
      return NextResponse.json({error: 'The owner account cannot be changed from this screen.'}, {status: 409});
    }

    const {error: profileError} = await admin.from('akl_profiles').update({
      full_name: input.name,
      role: input.databaseRole,
      status: input.databaseStatus,
    }).eq('id', id);
    if (profileError) throw profileError;

    const {data: userResult, error: userError} = await admin.auth.admin.updateUserById(id, {
      app_metadata: {site: 'anykitlab', role: input.databaseRole},
      user_metadata: {site: 'anykitlab', full_name: input.name},
    });
    if (userError) {
      const {error: rollbackError} = await admin.from('akl_profiles').update({
        full_name: current.full_name,
        role: current.role,
        status: current.status,
      }).eq('id', id);
      if (rollbackError) console.error('Admin team profile rollback failed:', rollbackError.message);
      throw userError;
    }

    const email = userResult.user.email || '';
    return NextResponse.json({member: {
      id,
      name: input.name,
      email,
      loginId: email,
      temporaryPassword: '',
      role: input.role,
      status: input.status,
    }});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the team member.';
    const status = /required|valid|role|status|too long/i.test(message) ? 400 : 500;
    console.error('Admin team update failed:', message);
    return NextResponse.json({error: message}, {status});
  }
}

export async function DELETE(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const {id} = await params;
  if (id === owner.id) return NextResponse.json({error: 'You cannot remove your own owner access.'}, {status: 409});

  try {
    const admin = getSupabaseAdminClient();
    const {data: current, error: currentError} = await admin.from('akl_profiles').select('role').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({error: 'Team member not found.'}, {status: 404});
    if (toAdminRole(current.role) === 'Owner') return NextResponse.json({error: 'Owner access cannot be removed.'}, {status: 409});
    const {error} = await admin.from('akl_profiles').update({status: 'suspended'}).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ok: true, status: 'Suspended'});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to remove team access.';
    console.error('Admin team removal failed:', message);
    return NextResponse.json({error: message}, {status: 500});
  }
}
