import LogoutButton from "@/components/feature/Settings/LogoutButton";
export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <LogoutButton />
    </div>
  );
}
