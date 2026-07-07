<section className="grid grid-cols-2 gap-4">
  {tiles.map((tile, index) => (
    <button
      key={index}
      onClick={() => navigate(tile.path)}
      className="group relative overflow-hidden p-5 rounded-[2rem] bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-500 text-left"
    >
      {/* Accent de couleur discret */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white to-gray-50 rounded-full -mr-8 -mt-8 opacity-50" />
      
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
        style={{ background: tile.color, color: '#ffffff' }}
      >
        {tile.icon}
      </div>
      
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Service</p>
      <h3 className="text-gray-900 font-black text-lg leading-tight group-hover:text-[var(--color-primary)] transition-colors">
        {tile.label}
      </h3>
    </button>
  ))}
</section>
