using api.src.Application.DTOs.NotificationDto;

namespace api.src.Application.Interfaces;

public interface IBookingNotificationQueue
{
    ValueTask QueueBookingConfirmationAsync(BookingConfirmationEmailJob job, CancellationToken cancellationToken = default);
    ValueTask<BookingConfirmationEmailJob> DequeueAsync(CancellationToken cancellationToken);
}
