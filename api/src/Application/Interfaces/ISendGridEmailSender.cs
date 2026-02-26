using api.src.Application.DTOs.NotificationDto;

namespace api.src.Application.Interfaces;

public interface ISendGridEmailSender
{
    Task SendBookingConfirmationAsync(BookingConfirmationEmailJob job, CancellationToken cancellationToken = default);
    Task SendPasswordResetAsync(string toEmail, string toName, string resetUrl, CancellationToken cancellationToken = default);
}
