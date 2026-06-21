import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TokoKu - E-Commerce Platform',
  description: 'TokoKu - Your trusted e-commerce platform',
  generator: 'TokoKu Team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
