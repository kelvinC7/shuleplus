export function generateStaticParams() {
  return [{ tripId: 'placeholder' }];
}

export default function TripDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}