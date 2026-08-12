import NavegacionCliente from "@/components/cliente/navegacion-cliente";

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fff8ee]">
      <NavegacionCliente />

      <div className="lg:pl-64">
        {children}
      </div>
    </div>
  );
}
