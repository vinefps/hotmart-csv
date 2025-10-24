const Loading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="relative">
        {/* Círculos animados de fundo */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-20 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        
        {/* Container principal */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20">
          {/* Spinner principal */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-400 animate-spin animation-reverse animation-delay-150"></div>
            <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-blue-400 animate-spin animation-delay-300"></div>
            
            {/* Ícone central */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          </div>
          
          {/* Texto de carregamento */}
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-white">Carregando</h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-150"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-300"></div>
            </div>
            <p className="text-sm text-gray-300 mt-4">Preparando seus dados...</p>
          </div>
          
          {/* Barra de progresso */}
          <div className="mt-8 w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 h-full rounded-full animate-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;