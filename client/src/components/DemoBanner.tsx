import { useAuth } from "./AuthProvider";
import { UserRole } from "@shared/schema";

export default function DemoBanner() {
  const { user } = useAuth();

  if (user?.role !== UserRole.enum.GUEST) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-center p-2 text-black">
      <strong>Demo Mode:</strong> All actions are for demonstration only and will not be saved.
    </div>
  );
}
