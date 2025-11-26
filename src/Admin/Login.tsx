import selloLila from '/sello_vinotinto.svg'

function Login() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F8EAFE]">
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
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg py-3 hover:bg-gray-50 transition"
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