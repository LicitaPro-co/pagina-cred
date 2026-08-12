import AdministradorLayout from "@/components/administrador/layout";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdministradorLayout>
      {children}
    </AdministradorLayout>
  );
}
