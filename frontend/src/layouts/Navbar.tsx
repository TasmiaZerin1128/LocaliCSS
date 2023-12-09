import { Disclosure } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {

  const navigate = useNavigate();

  return (
    <Disclosure
      as="nav"
      className="bg-primary"
      data-testid="navbar-landing"
    >
      {() => (
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden" />
            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex flex-shrink-0 items-center">
                <img
                  className="block h-8 w-auto lg:hidden cursor-pointer"
                  src="\ReDeFix-Logo-White.png"
                  alt="ReDeFix"
                  onClick={() => navigate('/')}
                />
                <img
                  className="hidden h-8 w-auto lg:block cursor-pointer"
                  src="\ReDeFix-Logo-White.png"
                  alt="ReDeFix"
                  onClick={() => navigate('/')}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Disclosure>
  );
}