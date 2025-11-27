export async function sendNotificationToUser(token: string, message: string, title: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard/notification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            message,
            title,
        }),
    });

    if (!response.ok) {
        throw new Error('Error sending notification');
    }

    const json = await response.json();
    console.log("Notification response:", json);
    return json;
}