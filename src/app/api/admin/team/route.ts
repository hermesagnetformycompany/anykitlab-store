import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {parseTeamCreateInput} from '@/lib/admin-team';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

function forbidden() {
  return NextResponse.json({error: 'Owner access is required to manage the team.'}, {status: 403});
}

export async function POST(request: NextRequest) {
  const owner = await getVerifiedAdmin();
  if (!owner || owner.role !== 'Owner') return forbidden();

  try {
    const input = parseTeamCreateInput(await request.json());
    const admin = getSupabaseAdminClient();
    const {data: created, error: createError} = await admin.auth.admin.createUser({
      email: input.email,
      password: input.temporaryPassword,
      email_confirm: true,
      app_metadata: {site: 'anykitlab', role: input.databaseRole},
      user_metadata: {site: 'anykitlab', full_name: input.name},
    });
    if (createError || !created.user) throw createError || new Error('Unable to create the team account.');

    const {error: profileError} = await admin.from('akl_profiles').upsert({
      id: created.user.id,
      full_name: input.name,
      role: input.databaseRole,
      status: 'invited',
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return NextResponse.json({member: {
      id: created.user.id,
      name: input.name,
      email: input.email,
      loginId: input.email,
      temporaryPassword: '',
      role: input.role,
      status: 'Invited',
    }}, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add the team member.';
    const status = /required|valid|password|role|too long/i.test(message) ? 400 : 500;
    console.error('Admin team creation failed:', message);
    return NextResponse.json({error: message}, {status});
  }
}
