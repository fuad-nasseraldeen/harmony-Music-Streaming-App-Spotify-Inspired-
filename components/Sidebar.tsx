'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase-client';
import { 
  HiHome, 
  HiSearch, 
  HiLibrary, 
  HiPlus,
  HiHeart,
  HiLogout,
  HiStar
} from 'react-icons/hi';
import { usePlayerStore } from '@/store/usePlayerStore';
import { graphqlRequest } from '@/lib/graphql';
import { useEffect, useState } from 'react';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const supabase = createClient();
  const { reset } = usePlayerStore();
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkPremium = async () => {
      if (!user) {
        setIsPremium(false);
        return;
      }

      try {
        const data = await graphqlRequest<{ subscription: { status: string } | null }>(
          `query { subscription { status } }`
        );
        setIsPremium(data.subscription?.status === 'active' || data.subscription?.status === 'trialing');
      } catch (error) {
        setIsPremium(false);
      }
    };

    checkPremium();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    router.push('/auth');
  };

  const routes = [
    {
      icon: HiHome,
      label: 'Home',
      active: pathname === '/',
      href: '/',
    },
    {
      icon: HiSearch,
      label: 'Search',
      active: pathname === '/search',
      href: '/search',
    },
    {
      icon: HiLibrary,
      label: 'Your Library',
      active: pathname === '/library',
      href: '/library',
    },
  ];

  const userRoutes = [
    {
      icon: HiPlus,
      label: 'Upload',
      active: pathname === '/upload',
      href: '/upload',
    },
    {
      icon: HiHeart,
      label: 'Liked Songs',
      active: pathname === '/liked',
      href: '/liked',
    },
    {
      icon: HiStar,
      label: isPremium ? 'Premium ✓' : 'Premium',
      active: pathname === '/subscription',
      href: '/subscription',
    },
  ];

  return (
    <div className="flex h-full">
      <div className="hidden md:flex flex-col gap-y-2 bg-black h-full w-[300px] p-2">
        <div className="bg-neutral-900 rounded-lg h-full w-full p-4">
          <div className="flex flex-col gap-y-4">
            {routes.map((item) => (
              <div
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`
                  flex flex-row items-center gap-x-4 text-sm font-medium cursor-pointer hover:text-white transition text-neutral-400
                  ${item.active ? 'text-white' : ''}
                `}
              >
                <item.icon size={26} />
                <p className="truncate w-full">{item.label}</p>
              </div>
            ))}
          </div>

          {user && (
            <>
              <div className="mt-8">
                {userRoutes.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className={`
                      flex flex-row items-center gap-x-4 text-sm font-medium cursor-pointer hover:text-white transition text-neutral-400
                      ${item.active ? 'text-white' : ''}
                    `}
                  >
                    <item.icon size={26} />
                    <p className="truncate w-full">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-neutral-700">
                <div
                  onClick={handleLogout}
                  className="flex flex-row items-center gap-x-4 text-sm font-medium cursor-pointer hover:text-white transition text-neutral-400"
                >
                  <HiLogout size={26} />
                  <p className="truncate w-full">Logout</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
