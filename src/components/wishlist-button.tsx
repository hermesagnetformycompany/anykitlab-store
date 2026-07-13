'use client';

import {Heart} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {useStore} from '@/lib/store';

export function WishlistButton({slug}: {slug: string}) {
  const router = useRouter();
  const {customer, wishlist, toggleWishlist} = useStore();
  const [error, setError] = useState('');
  const saved = wishlist.includes(slug);

  return (
    <button
      type="button"
      aria-pressed={saved}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      onClick={async () => {
        if (!customer) {
          router.push(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
          return;
        }
        const result = await toggleWishlist(slug);
        setError(result.error || '');
      }}
    >
      <Heart aria-hidden="true" fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
      {error && <span className="sr-only">{error}</span>}
    </button>
  );
}
