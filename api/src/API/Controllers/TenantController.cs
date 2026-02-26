using api.src.Application.DTOs;
using api.src.Application.DTOs.TenantDto;
using api.src.Application.Interfaces;
using api.src.Domain.Enums;
using api.src.Infrastructure.Services;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Stripe;
using Stripe.Checkout;
using System.Text;

namespace api.src.API.Controllers
{
    [Route("api/tenant")]
    [ApiController]
    public class TenantController : ControllerBase
    {
        private readonly ITenantRepository _tenantRepository;
        private readonly StripeOptions _stripeOptions;
        private readonly ILogger<TenantController> _logger;

        public TenantController(
            ITenantRepository tenantRepository,
            IOptions<StripeOptions> stripeOptions,
            ILogger<TenantController> logger)
        {
            _tenantRepository = tenantRepository;
            _stripeOptions = stripeOptions.Value;
            _logger = logger;
        }
        [HttpPost]
        public async Task<IActionResult> CreateTenant([FromBody] CreateTenantDto createTenantDto)
        {
            try
            {
                var tenant = await _tenantRepository.CreateTenantAsync(createTenantDto);

                if (createTenantDto.SubscriptionPlan == SubscriptionPlan.Starter)
                {
                    return Ok(new
                    {
                        tenant.Id,
                        tenant.Name,
                        requiresPayment = false
                    });
                }

                var configuredPriceOrProductId = createTenantDto.SubscriptionPlan == SubscriptionPlan.Growth
                    ? _stripeOptions.GrowthPriceId
                    : _stripeOptions.EnterprisePriceId;

                if (string.IsNullOrWhiteSpace(_stripeOptions.SecretKey) || string.IsNullOrWhiteSpace(configuredPriceOrProductId))
                {
                    return BadRequest(new { message = "Stripe is not configured correctly for paid plans." });
                }

                StripeConfiguration.ApiKey = _stripeOptions.SecretKey;
                var priceId = await ResolvePriceIdAsync(configuredPriceOrProductId);
                if (string.IsNullOrWhiteSpace(priceId))
                    return BadRequest(new { message = "Stripe paid plan price is invalid. Use a price_ id or a product with a default price." });

                var service = new SessionService();
                var successUrl = BuildRedirectUrl(_stripeOptions.SuccessUrl, tenant.Id, includeSessionId: true);
                var cancelUrl = BuildRedirectUrl(_stripeOptions.CancelUrl, tenant.Id);

                var session = await service.CreateAsync(new SessionCreateOptions
                {
                    Mode = "subscription",
                    SuccessUrl = successUrl,
                    CancelUrl = cancelUrl,
                    CustomerEmail = createTenantDto.AdminEmail,
                    LineItems = new List<SessionLineItemOptions>
                    {
                        new()
                        {
                            Price = priceId,
                            Quantity = 1
                        }
                    },
                    Metadata = new Dictionary<string, string>
                    {
                        { "tenantId", tenant.Id.ToString() },
                        { "plan", createTenantDto.SubscriptionPlan.ToString() }
                    }
                });

                await _tenantRepository.SetCheckoutSessionAsync(tenant.Id, session.Id);

                return Ok(new
                {
                    tenant.Id,
                    tenant.Name,
                    requiresPayment = true,
                    checkoutUrl = session.Url
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe checkout session creation failed");
                return BadRequest(new { message = ex.StripeError?.Message ?? ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tenant registration failed before Stripe redirect");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Registration failed while creating payment session."
                });
            }
        }
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAllTenant()
        {
            if (!TryGetCurrentTenantId(out var currentTenantId))
                return Unauthorized(new { message = "Valid TenantId claim is required." });

            var tenants = await _tenantRepository.GetAllTenantAsync();
            if (tenants == null)
                return NotFound("there is no any company register");
            tenants = tenants.Where(t => t.Id == currentTenantId).ToList();

            return Ok(tenants.Select(s => new
            {
                s.Name,
                s.Id,
                s.Slug,
                s.PaymentStatus,
                s.StripeCheckoutSessionId,
                s.PaymentActivatedAt
            }));
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTenant([FromRoute] Guid id, [FromBody] UpdateTenantRequestDto updateTenantRequestDto)
        {
            if (!TryGetCurrentTenantId(out var currentTenantId))
                return Unauthorized(new { message = "Valid TenantId claim is required." });
            if (id != currentTenantId)
                return Forbid();

            var tenant = await _tenantRepository.UpdateTenantAsync(currentTenantId, updateTenantRequestDto);
            if (tenant is null)
                return NotFound(new { message = "tenant not found" });
            return Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.Email,
                tenant.Phone,
                tenant.Description,
                tenant.TimeZone,
                tenant.LogoUrl,
                tenant.SubscriptionPlan,
                tenant.PaymentStatus,
                tenant.StripeCheckoutSessionId,
                tenant.StripeSubscriptionId,
                tenant.PaymentActivatedAt
            });

        }
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetTenantById([FromRoute] Guid id)
        {
           if (!TryGetCurrentTenantId(out var currentTenantId))
               return Unauthorized(new { message = "Valid TenantId claim is required." });
           if (id != currentTenantId)
               return Forbid();

           var tenant = await _tenantRepository.GetTenantByIdAsync(currentTenantId);
           if (tenant is null)
                return NotFound(new { message = "tenant not found" });
           return Ok(new
           {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.PaymentStatus,
                tenant.StripeCheckoutSessionId,
                tenant.StripeSubscriptionId,
                tenant.PaymentActivatedAt
           });
        }
            
        
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteTenant([FromRoute] Guid id)
        {
            if (!TryGetCurrentTenantId(out var currentTenantId))
                return Unauthorized(new { message = "Valid TenantId claim is required." });
            if (id != currentTenantId)
                return Forbid();

            var result = await _tenantRepository.DeleteTenantAsync(currentTenantId);

            if (!result)
                return BadRequest(new { message = "Failed to delete tenant" });

            return Ok(new { message = "Tenant deleted successfully" });

        }    

        [HttpPost("stripe/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> StripeWebhook()
        {
            var json = await new StreamReader(HttpContext.Request.Body, Encoding.UTF8).ReadToEndAsync();
            var signatureHeader = Request.Headers["Stripe-Signature"];

            if (string.IsNullOrWhiteSpace(_stripeOptions.WebhookSecret))
                return BadRequest(new { message = "Stripe webhook secret is not configured." });

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, _stripeOptions.WebhookSecret);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Invalid Stripe webhook signature");
                return BadRequest();
            }

            if (stripeEvent.Type == "checkout.session.completed")
            {
                var session = stripeEvent.Data.Object as Session;
                var tenantIdValue = session?.Metadata?.GetValueOrDefault("tenantId");
                if (Guid.TryParse(tenantIdValue, out var tenantId))
                {
                    var activated = await _tenantRepository.MarkPaymentSucceededAsync(
                        tenantId,
                        session?.Id,
                        session?.SubscriptionId);
                    _logger.LogInformation("Stripe checkout completed for tenant {TenantId}, activated={Activated}", tenantId, activated);
                }
            }

            return Ok();
        }

        [HttpGet("stripe/confirm")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmStripePayment([FromQuery] Guid tenantId, [FromQuery(Name = "session_id")] string? sessionId = null)
        {
            if (tenantId == Guid.Empty)
                return BadRequest(new { message = "tenantId is required." });

            // Fallback path for local/dev when checkout session id is unavailable on redirect.
            // This still requires a valid tenant id from Stripe success redirect.
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                var activatedWithoutSession = await _tenantRepository.MarkPaymentSucceededAsync(tenantId, null, null);
                if (!activatedWithoutSession)
                    return NotFound(new { message = "Tenant not found for activation." });

                _logger.LogInformation("Tenant {TenantId} activated via fallback confirm path without session id.", tenantId);
                return Ok(new { message = "Tenant activated successfully." });
            }

            if (string.IsNullOrWhiteSpace(_stripeOptions.SecretKey))
                return BadRequest(new { message = "Stripe is not configured correctly." });

            StripeConfiguration.ApiKey = _stripeOptions.SecretKey;

            Session? session;
            try
            {
                var service = new SessionService();
                session = await service.GetAsync(sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to verify Stripe session {SessionId}", sessionId);
                return BadRequest(new { message = "Unable to verify Stripe session." });
            }

            if (session == null)
                return BadRequest(new { message = "Stripe session not found." });

            var verifiedSession = session;
            var metadataTenantId = verifiedSession.Metadata?.GetValueOrDefault("tenantId");
            if (!Guid.TryParse(metadataTenantId, out var sessionTenantId) || sessionTenantId != tenantId)
                return BadRequest(new { message = "Stripe session does not match tenant." });

            if (!string.Equals(verifiedSession.Status, "complete", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Stripe checkout is not completed yet." });

            var activated = await _tenantRepository.MarkPaymentSucceededAsync(
                tenantId,
                verifiedSession.Id,
                verifiedSession.SubscriptionId);
            if (!activated)
                return NotFound(new { message = "Tenant not found for activation." });

            return Ok(new { message = "Tenant activated successfully." });
        }

        private static async Task<string?> ResolvePriceIdAsync(string configuredPriceOrProductId)
        {
            if (configuredPriceOrProductId.StartsWith("price_", StringComparison.OrdinalIgnoreCase))
                return configuredPriceOrProductId;

            if (!configuredPriceOrProductId.StartsWith("prod_", StringComparison.OrdinalIgnoreCase))
                return null;

            var productService = new ProductService();
            var product = await productService.GetAsync(configuredPriceOrProductId);
            if (product?.DefaultPriceId is string defaultPriceId && !string.IsNullOrWhiteSpace(defaultPriceId))
                return defaultPriceId;

            return null;
        }

        private static string BuildRedirectUrl(string baseUrl, Guid tenantId, bool includeSessionId = false)
        {
            var withTenant = AppendQuery(baseUrl, "tenantId", tenantId.ToString());
            return includeSessionId
                ? AppendQuery(withTenant, "session_id", "{CHECKOUT_SESSION_ID}")
                : withTenant;
        }

        private static string AppendQuery(string url, string key, string value)
        {
            var separator = url.Contains('?') ? "&" : "?";
            return $"{url}{separator}{key}={value}";
        }

        private bool TryGetCurrentTenantId(out Guid tenantId)
        {
            var tenantIdValue = User.FindFirstValue("TenantId");
            return Guid.TryParse(tenantIdValue, out tenantId);
        }
        
    }
}
