export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white p-8 shadow-[0_30px_80px_-50px_rgba(15,35,69,0.6)] sm:p-10">{children}</div>
    </div>
  );
}
