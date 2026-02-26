using api.Application.DTOs.BookingDto;

namespace api.src.Application.Interfaces;

public interface IPublicBookingService
{
    Task<PublicTenantCatalogDto> GetTenantCatalogAsync(string tenantSlug);
    Task<PublicAvailabilityResponseDto> GetAvailabilityAsync(string tenantSlug, int serviceId, int staffId, string date, int timezoneOffsetMinutes);
    Task<PublicBookingResponseDto> CreatePublicBookingAsync(string tenantSlug, PublicCreateBookingDto dto);
}
