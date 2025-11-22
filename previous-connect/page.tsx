'use client';

export default function ConnectPage() {
    const handleConnect = () => {
        const params = new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_META_APP_ID!,
            redirect_uri: process.env.NEXT_PUBLIC_META_REDIRECT_URI!,
            scope: [
                'pages_show_list',
                'pages_read_engagement',
                'pages_manage_posts',
                'instagram_basic',
                'instagram_content_publish'
            ].join(','),
            response_type: 'code',
        });

        window.location.href = `${process.env.NEXT_PUBLIC_META_OAUTH_URL}?${params.toString()}`;
    };

    return (
        <main className="flex flex-col items-center justify-center h-screen gap-4">
            <h1 className="text-2xl font-semibold">Connect your social accounts</h1>
            <button
                onClick={handleConnect}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Connect Instagram & Facebook
            </button>
        </main>
    );
}
