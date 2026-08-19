import { ServiceItemService } from '@/services/service-item-service';

/**
 * ServiceGrid - Server Component that fetches and displays active ServiceItem records.
 * Renders a responsive grid of service cards with icons, titles, and descriptions.
 */
export default async function ServiceGrid() {
  const services = await ServiceItemService.getActiveServiceItems();

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white" aria-label="Our Services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Our Services</h2>
          <p className="mt-4 text-lg text-gray-600">Discover what we can do for you</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service._id.toString()}
              className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300"
            >
              {/* Icon - supports both URL images and emoji/icon class */}
              {service.icon && (
                <div className="mb-4">
                  {service.icon.startsWith('http') || service.icon.startsWith('/') ? (
                    <img src={service.icon} alt="" className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-4xl" role="img" aria-hidden="true">
                      {service.icon}
                    </span>
                  )}
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
