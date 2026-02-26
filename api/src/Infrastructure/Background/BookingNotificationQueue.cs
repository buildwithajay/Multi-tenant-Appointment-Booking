using System.Threading.Channels;
using api.src.Application.DTOs.NotificationDto;
using api.src.Application.Interfaces;

namespace api.src.Infrastructure.Background;

public class BookingNotificationQueue : IBookingNotificationQueue
{
    private readonly Channel<BookingConfirmationEmailJob> _queue = Channel.CreateUnbounded<BookingConfirmationEmailJob>();

    public async ValueTask QueueBookingConfirmationAsync(BookingConfirmationEmailJob job, CancellationToken cancellationToken = default)
    {
        await _queue.Writer.WriteAsync(job, cancellationToken);
    }

    public async ValueTask<BookingConfirmationEmailJob> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}
