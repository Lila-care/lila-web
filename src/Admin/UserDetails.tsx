import { useEffect, useState } from "react";
import { UserProfileData } from "./UsersTable";
import { fetchUserDetails } from "@/api/users";
import { sendNotificationToUser } from "@/api/notifications";

function UserDetails({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para la notificación
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchUserDetails(userId)
      .then((data) => setUser(data))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSendNotification = async () => {
    if (!notificationTitle || !notificationBody) return;
    setSending(true);
    try {
      // Aquí deberías llamar tu API para enviar la notificación
      console.log("Enviando notificación a", user?.device.deviceToken, notificationTitle, notificationBody);
      await sendNotificationToUser(
        user!.device.deviceToken,
        notificationBody,
        notificationTitle
      )
      alert("Notificación enviada!");
      setNotificationTitle("");
      setNotificationBody("");
    } catch (err) {
      console.error(err);
      alert("Error al enviar la notificación");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 p-4">Loading...</p>;
  }

  if (!user) {
    return <p className="text-red-500 p-4">User not found</p>;
  }

  return (
    <div className="p-6 space-y-8">
      {/* Sección Profile */}
      <div className="space-y-2 text-gray-700">
        <h2 className="text-xl font-bold">User Profile</h2>
        <p><span className="font-semibold">User ID:</span> {user.profile.userId}</p>
        <p><span className="font-semibold">Profile ID:</span> {user.profile.id}</p>
        <p><span className="font-semibold">First Report:</span> {user.profile.firstReport}</p>
        <p><span className="font-semibold">Period Days:</span> {user.profile.periodDays}</p>
        <p><span className="font-semibold">Cycle Size:</span> {user.profile.cycleSize}</p>
      </div>

      {/* Sección Notificación */}
      <div className="space-y-4 border-t pt-6">
        <h2 className="text-xl font-bold">Enviar notificación</h2>
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            placeholder="Title"
            className="border rounded p-2"
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Body"
            className="border rounded p-2"
            value={notificationBody}
            onChange={(e) => setNotificationBody(e.target.value)}
          />
          <button
            className="bg-primary text-white rounded px-4 py-2 : disabled:bg-gray-400"
            onClick={handleSendNotification}
            disabled={sending}
          >
            {sending ? "Enviando..." : "Enviar notificación"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDetails;
