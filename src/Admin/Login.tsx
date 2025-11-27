import selloLila from '/sello_vinotinto.svg'


const handleGoogleLogin = () => {
  const domain = import.meta.env.VITE_AUTH_DOMAIN;
  const clientId = "51fiord6co5ge8go197fc111h9";
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;

  const params = new URLSearchParams({
    identity_provider: "Google",
    redirect_uri: redirectUri,
    response_type: "code", // usa "code" en minúsculas
    client_id: clientId,
    scope: "openid",
  });

  const url = `${domain}/oauth2/authorize?${params.toString()}`;

  console.log("Cognito auth URL:", url);
  window.location.assign(url);
};


function Login() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md text-center space-y-6">
        
        {/* Logo */}
        <img 
          src={selloLila} 
          alt="Lila Logo" 
          className="mx-auto h-20 object-contain"
        />

        <h1 className="text-2xl font-bold text-gray-800">
          Bienvenida al Panel Administrativo
        </h1>
        <p className="text-gray-500">
          Accede con tu correo corporativo para continuar
        </p>

        <button
          onClick={handleGoogleLogin}
          className="flex bg-primary items-center justify-center gap-3 w-full border border-gray-300 rounded-lg py-3 hover:bg-gray-50 transition"
        >
          <img 
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="h-5 w-5"
          />
          <span className="text-white font-medium">Continuar con Google</span>
        </button>

      </div>
    </div>
  );
}


export default Login;