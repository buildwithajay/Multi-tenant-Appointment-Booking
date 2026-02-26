using api.src.Application.DTOs.NotificationDto;
using api.src.Application.Interfaces;
using Microsoft.Extensions.Options;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace api.src.Infrastructure.Services;

public class SendGridEmailSender : ISendGridEmailSender
{
    private readonly SendGridOptions _options;
    private readonly ILogger<SendGridEmailSender> _logger;

    public SendGridEmailSender(
        IOptions<SendGridOptions> options,
        ILogger<SendGridEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendBookingConfirmationAsync(BookingConfirmationEmailJob job, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(_options.FromEmail))
        {
            _logger.LogWarning("SendGrid is not configured. Skipping booking confirmation email to {ToEmail}", job.ToEmail);
            return;
        }

        var client = new SendGridClient(_options.ApiKey.Trim());
        var from = new EmailAddress(_options.FromEmail.Trim(), _options.FromName);
        var to = new EmailAddress(job.ToEmail.Trim(), string.IsNullOrWhiteSpace(job.ToName) ? job.ToEmail : job.ToName);
        var subject = $"Booking Confirmed - {job.ServiceName}";
        var plainText = BuildPlainText(job);
        var html = BuildHtml(job);

        var message = MailHelper.CreateSingleEmail(from, to, subject, plainText, html);
        var response = await client.SendEmailAsync(message, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = response.Body == null
                ? string.Empty
                : await response.Body.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"SendGrid email failed. Status: {(int)response.StatusCode}. Body: {body}");
        }
    }

    public async Task SendPasswordResetAsync(string toEmail, string toName, string resetUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(_options.FromEmail))
        {
            _logger.LogWarning("SendGrid is not configured. Skipping password reset email to {ToEmail}", toEmail);
            return;
        }

        var client = new SendGridClient(_options.ApiKey.Trim());
        var from = new EmailAddress(_options.FromEmail.Trim(), _options.FromName);
        var to = new EmailAddress(toEmail.Trim(), string.IsNullOrWhiteSpace(toName) ? toEmail : toName);
        var subject = "Reset your password";
        var safeUrl = System.Net.WebUtility.HtmlEncode(resetUrl);
        var plainText = $"Reset your password using this link: {resetUrl}";
        var html = $"""
                    <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
                      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
                        <h2 style="margin:0 0 8px 0;color:#2563eb">Password Reset</h2>
                        <p style="margin:0 0 16px 0;color:#475569">Hi {System.Net.WebUtility.HtmlEncode(toName)}, click the button below to reset your password.</p>
                        <a href="{safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600">Reset Password</a>
                        <p style="margin:16px 0 0 0;color:#64748b;font-size:12px">If you did not request this, you can ignore this email.</p>
                      </div>
                    </div>
                    """;

        var message = MailHelper.CreateSingleEmail(from, to, subject, plainText, html);
        var response = await client.SendEmailAsync(message, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = response.Body == null
                ? string.Empty
                : await response.Body.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"SendGrid password reset email failed. Status: {(int)response.StatusCode}. Body: {body}");
        }
    }

    private static string BuildHtml(BookingConfirmationEmailJob job)
    {
        var start = job.StartTime.ToLocalTime().ToString("f");
        var end = job.EndTime.ToLocalTime().ToString("t");
        var notes = string.IsNullOrWhiteSpace(job.Notes) ? "None" : System.Net.WebUtility.HtmlEncode(job.Notes);

        return $"""
                <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
                  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
                    <h2 style="margin:0 0 8px 0;color:#2563eb">Booking Confirmed</h2>
                    <p style="margin:0 0 16px 0;color:#475569">Hi {System.Net.WebUtility.HtmlEncode(job.ToName)}, your appointment has been confirmed.</p>
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px">
                      <p style="margin:0 0 8px 0"><strong>Business:</strong> {System.Net.WebUtility.HtmlEncode(job.TenantName)}</p>
                      <p style="margin:0 0 8px 0"><strong>Service:</strong> {System.Net.WebUtility.HtmlEncode(job.ServiceName)}</p>
                      <p style="margin:0 0 8px 0"><strong>Staff:</strong> {System.Net.WebUtility.HtmlEncode(job.StaffName)}</p>
                      <p style="margin:0 0 8px 0"><strong>Date & Time:</strong> {start} - {end}</p>
                      <p style="margin:0"><strong>Notes:</strong> {notes}</p>
                    </div>
                    <p style="margin:16px 0 0 0;color:#64748b;font-size:12px">If you need to change your appointment, please contact the business directly.</p>
                  </div>
                </div>
                """;
    }

    private static string BuildPlainText(BookingConfirmationEmailJob job)
    {
        var start = job.StartTime.ToLocalTime().ToString("f");
        var end = job.EndTime.ToLocalTime().ToString("t");
        return
            $"Booking Confirmed\n\n" +
            $"Hi {job.ToName}, your appointment has been confirmed.\n" +
            $"Business: {job.TenantName}\n" +
            $"Service: {job.ServiceName}\n" +
            $"Staff: {job.StaffName}\n" +
            $"Date & Time: {start} - {end}\n" +
            $"Notes: {(string.IsNullOrWhiteSpace(job.Notes) ? "None" : job.Notes)}\n";
    }
}
