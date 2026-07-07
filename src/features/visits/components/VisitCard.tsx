// 📁 src/components/visits/VisitCard.tsx 
export const VisitCard = memo(({ visit, onClick, compact = false }: VisitCardProps) => {
  const statusConfig = getStatusConfig(visit.status);

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-4">
        {/* En-tête : Badge Status discret + Type */}
        <span 
          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          {statusConfig.label}
        </span>
        <span className="text-gray-400 text-xs font-medium">
          {formatDate(visit.scheduled_date)}
        </span>
      </div>

      {/* Corps : Nom + Lieu */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-bold text-[--color-primary]">
          {visit.patient?.first_name?.[0] || 'U'}
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-lg">
            {visit.patient?.first_name} {visit.patient?.last_name}
          </h3>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            <MapPin size={12} /> {visit.patient?.address || 'Adresse non renseignée'}
          </p>
        </div>
      </div>

      {/* Pied : Horaire et Bouton Action */}
      <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Clock size={16} className="text-[--color-primary]" />
          <span>{visit.scheduled_time}</span>
        </div>
        <button className="text-[--color-primary] font-bold text-sm hover:underline">
          Détails →
        </button>
      </div>
    </div>
  );
});
