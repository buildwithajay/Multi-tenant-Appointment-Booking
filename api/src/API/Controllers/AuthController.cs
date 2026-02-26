using System.Security.Claims;
using api.Application.DTOs;
using api.Application.Interfaces.Auth;
using api.src.Application.Interfaces;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.src.Application.DTOs;
using api.src.Infrastructure.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.WebUtilities;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

using Microsoft.AspNetCore.Mvc;
using Stripe;
using Stripe.Checkout;
using System.Text;

namespace api.API.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly SignInManager<User> _signInManager;
        private readonly IJwtService _jwtService;
        private readonly ISendGridEmailSender _emailSender;
        private readonly AppDbContext _dbContext;
        private readonly StripeOptions _stripeOptions;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            IJwtService jwtService,
            ISendGridEmailSender emailSender,
            AppDbContext dbContext,
            IOptions<StripeOptions> stripeOptions,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _emailSender = emailSender;
            _dbContext = dbContext;
            _stripeOptions = stripeOptions.Value;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto loginRequestDto)
        {
            var email = loginRequestDto.Email?.Trim();
            var password = loginRequestDto.Password ?? string.Empty;
            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized(new { message = "Invalid email" });

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
                return Unauthorized(new {message="Invalid email"});
            var result = await _signInManager.CheckPasswordSignInAsync(user, password, false);
            if(!result.Succeeded)
                return Unauthorized(new {message = "Invalid password"});

            if (user.TenantId.HasValue)
            {
                var tenant = await _dbContext.Tenants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == user.TenantId.Value);
                if (tenant == null)
                    return Unauthorized(new { message = "Tenant account not found." });
                if (!tenant.IsActive)
                {
                    if (string.Equals(tenant.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
                    {
                        tenant.IsActive = true;
                        tenant.UpdatedAt = DateTime.UtcNow;
                        await _dbContext.SaveChangesAsync();
                    }
                    else
                    {
                        var repaired = await TryRepairLegacyPaidTenantAsync(tenant);
                        if (!repaired)
                            return Unauthorized(new { message = "Subscription payment pending. Complete payment to access dashboard." });
                    }
                }
            }
            var roles = await _userManager.GetRolesAsync(user);
            var token = _jwtService.GenerateToken(user, roles);
            var refreshToken = _jwtService.GenerateRefreshToken();
            return Ok(new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    TenantId = user.TenantId,
                    Roles = roles.ToList()
                }
            });
        }

        private async Task<bool> TryRepairLegacyPaidTenantAsync(Tenant tenant)
        {
            if (string.IsNullOrWhiteSpace(_stripeOptions.SecretKey))
                return false;

            try
            {
                StripeConfiguration.ApiKey = _stripeOptions.SecretKey;
                var sessionService = new SessionService();

                Session? completedSession = null;
                if (!string.IsNullOrWhiteSpace(tenant.StripeCheckoutSessionId))
                {
                    var byId = await sessionService.GetAsync(tenant.StripeCheckoutSessionId);
                    if (byId != null &&
                        string.Equals(byId.Status, "complete", StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(byId.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
                    {
                        completedSession = byId;
                    }
                }

                if (completedSession == null)
                {
                    var sessions = await sessionService.ListAsync(new SessionListOptions { Limit = 100 });
                    completedSession = sessions.Data.FirstOrDefault(s =>
                        s != null &&
                        string.Equals(s.Status, "complete", StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(s.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase) &&
                        s.Metadata != null &&
                        s.Metadata.TryGetValue("tenantId", out var metadataTenantId) &&
                        Guid.TryParse(metadataTenantId, out var sessionTenantId) &&
                        sessionTenantId == tenant.Id);
                }

                if (completedSession == null)
                    return false;

                tenant.IsActive = true;
                tenant.PaymentStatus = "Paid";
                tenant.StripeCheckoutSessionId = completedSession.Id ?? tenant.StripeCheckoutSessionId;
                tenant.StripeSubscriptionId = completedSession.SubscriptionId ?? tenant.StripeSubscriptionId;
                tenant.PaymentActivatedAt = DateTime.UtcNow;
                tenant.UpdatedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Tenant {TenantId} activated via legacy repair on login.", tenant.Id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Legacy paid-tenant repair failed for tenant {TenantId}", tenant.Id);
                return false;
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto registerRequestDto)
        {
            var existingUser = await _userManager.FindByEmailAsync(registerRequestDto.Email);
           if(existingUser != null)
               return BadRequest(new {message = "Email already exists"});
           var user = new User
           {
               UserName = registerRequestDto.Email,
               Email = registerRequestDto.Email,
               FirstName = registerRequestDto.FirstName,
               LastName = registerRequestDto.LastName,
               TenantId = registerRequestDto.TenantId
               
             
           };
           var result = await _userManager.CreateAsync(user, registerRequestDto.Password);
           if (!result.Succeeded)
           {
               return BadRequest(result.Errors);
           }
           await _userManager.AddToRoleAsync(user, registerRequestDto.Role.ToString());
           return Ok(new {message = "User created"});
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            var generic = Ok(new { message = "If the account exists, a reset link has been sent." });
            var email = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
                return generic;

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
                return generic;

            var rawToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));
            var frontendBase = "http://localhost:5173";
            var resetUrl = $"{frontendBase}/reset-password?email={Uri.EscapeDataString(user.Email ?? email)}&token={Uri.EscapeDataString(encodedToken)}";

            try
            {
                await _emailSender.SendPasswordResetAsync(
                    user.Email ?? email,
                    $"{user.FirstName} {user.LastName}".Trim(),
                    resetUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send password reset email to {Email}", email);
            }

            return generic;
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            var email = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new { message = "Email, token and new password are required." });

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
                return BadRequest(new { message = "Invalid password reset request." });

            string decodedToken;
            try
            {
                var bytes = WebEncoders.Base64UrlDecode(request.Token);
                decodedToken = Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                return BadRequest(new { message = "Invalid or expired reset token." });
            }

            var result = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = result.Errors.FirstOrDefault()?.Description ?? "Failed to reset password."
                });
            }

            return Ok(new { message = "Password has been reset successfully." });
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> LoginWithGoogle([FromBody] GoogleTokenDto token)
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(token.AccessToken);
            
            if(payload == null)
                return Unauthorized();
            var user = await _userManager.FindByEmailAsync(payload.Email) ?? new User
            {
                FirstName = payload.GivenName,
                LastName = payload.FamilyName,
                Email = payload.Email,
                UserName = payload.Email.Trim(),
                ConcurrencyStamp = Guid.NewGuid().ToString(),
            };
            var result = await _userManager.CreateAsync(user);
            if(!result.Succeeded)
                return BadRequest(result.Errors);
            await _userManager.AddToRoleAsync(user, "ViewOnly");
            var role = await _userManager.GetRolesAsync(user);
            var jwt = _jwtService.GenerateToken(user, role);
            return Ok(new AuthResponseDto
            {
                Token = jwt,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Roles = role.ToList()
                }
            });
        }

        [HttpGet("get-me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if(userId == null)
                return Unauthorized();
            var user = await  _userManager.FindByIdAsync(userId);
            if(user == null)
                return Unauthorized();
            return Ok(new
            {
                user.Email,
                user.FirstName,
                user.LastName,
                user.TenantId
            });
        }
        
        
    }
}
