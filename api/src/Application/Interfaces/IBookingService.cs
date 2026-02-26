using api.Application.DTOs.BookingDto;

namespace api.src.Application.Interfaces;

public interface IBookingService
{
    Task<List<BookingDto>> GetAllBookingsAsync(Guid tenantId, string? currentUserId = null, bool staffOnly = false);
    Task<BookingDto> GetBookingByIdAsync(int id, Guid tenantId, string? currentUserId = null, bool staffOnly = false);
    Task<BookingDto> CreateBookingAsync(CreateBookingDto createBookingDto, Guid tenantId);
    Task<BookingDto> UpdateBookingAsync(int id, UpdateBookingDto updateBookingDto, Guid tenantId);
    Task<bool> DeleteBookingAsync(int id, Guid tenantId);
}
