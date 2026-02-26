using api.src.Application.Interfaces;

namespace api.src.Infrastructure.Background;

public class BookingNotificationWorker : BackgroundService
{
    private readonly IBookingNotificationQueue _queue;
    private readonly ISendGridEmailSender _emailSender;
    private readonly ILogger<BookingNotificationWorker> _logger;

    public BookingNotificationWorker(
        IBookingNotificationQueue queue,
        ISendGridEmailSender emailSender,
        ILogger<BookingNotificationWorker> logger)
    {
        _queue = queue;
        _emailSender = emailSender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Booking notification worker started");
        while (!stoppingToken.IsCancellationRequested)
        {
            api.src.Application.DTOs.NotificationDto.BookingConfirmationEmailJob? job = null;
            try
            {
                job = await _queue.DequeueAsync(stoppingToken);
                _logger.LogInformation("Processing booking confirmation email job for {Email}, attempt {Attempt}", job.ToEmail, job.Attempt);
                await _emailSender.SendBookingConfirmationAsync(job, stoppingToken);
                _logger.LogInformation("Booking confirmation email sent to {Email}", job.ToEmail);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process booking confirmation email job for {Email} at attempt {Attempt}", job?.ToEmail, job?.Attempt);
                if (job != null && job.Attempt < 3)
                {
                    var retryJob = job with { Attempt = job.Attempt + 1 };
                    await Task.Delay(TimeSpan.FromSeconds(2 * retryJob.Attempt), stoppingToken);
                    await _queue.QueueBookingConfirmationAsync(retryJob, stoppingToken);
                }
            }
        }
        _logger.LogInformation("Booking notification worker stopped");
    }
}
