import { auth } from '@/auth';

export default async function Page() {
  const Session = await auth();
  return (
    <p>
      My Info Page : {JSON.stringify(Session, null, 2)}
    </p>
  );
}
