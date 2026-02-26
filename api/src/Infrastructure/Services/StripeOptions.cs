namespace api.src.Infrastructure.Services;

public class StripeOptions
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string GrowthPriceId { get; set; } = string.Empty;
    public string EnterprisePriceId { get; set; } = string.Empty;
    public string SuccessUrl { get; set; } = "http://localhost:5173/register-business?status=paid";
    public string CancelUrl { get; set; } = "http://localhost:5173/register-business?status=cancelled";
}
