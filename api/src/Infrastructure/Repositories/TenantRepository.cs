
using System.Text.Json;
using System.Text.RegularExpressions;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.src.Application.DTOs;
using api.src.Application.DTOs.TenantDto;
using api.src.Application.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace api.src.Infrastructure.Repositories;

public class TenantRepository : ITenantRepository
{
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public TenantRepository(AppDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager=userManager;
    }
    public async Task<Tenant> CreateTenantAsync(CreateTenantDto dto)
    {
       if(await TenantExistAsync(dto.Email))
            throw new InvalidOperationException("A tenant with this email already exist");
       var slug = await GenerateUniqueSlugAsync(dto.Name!);
       var tenant = new Tenant
       {
           Name = dto.Name!,
           Slug = slug,
           Email = dto.Email,
           Phone = dto.Phone,
           BusinessType = dto.BusinessType,
           Description = dto.Description,
           SubscriptionPlan = dto.SubscriptionPlan,
           AddressLine1 = dto.AddressLine1,
           AddressLine2 = dto.AddressLine2,
           City = dto.City,
           State = dto.State,
           Country = dto.Country,
           PostalCode = dto.PostalCode,
           Website = dto.Website,
           
           IsActive = dto.SubscriptionPlan == api.src.Domain.Enums.SubscriptionPlan.Starter,
           PaymentStatus = dto.SubscriptionPlan == api.src.Domain.Enums.SubscriptionPlan.Starter ? "NotRequired" : "Pending",
           CreatedAt = DateTime.UtcNow
       };
       _context.Tenants.Add(tenant);
       await _context.SaveChangesAsync();
       var adminUser = new User
       {
           UserName = dto.AdminEmail,
           Email = dto.AdminEmail,
           EmailConfirmed = true,
           FirstName = dto.AdminFirstName,
           LastName = dto.AdminLastName,
           TenantId = tenant.Id,
           IsActive = true,
           CreatedAt = DateTime.UtcNow
       };

       var createUserResult = await _userManager.CreateAsync(adminUser, dto.AdminPassword);
        
       if (!createUserResult.Succeeded)
       {
           // Rollback tenant creation
           _context.Tenants.Remove(tenant);
           await _context.SaveChangesAsync();
           throw new InvalidOperationException(
               $"Failed to create admin user: {string.Join(", ", createUserResult.Errors.Select(e => e.Description))}"
           );
            
       }
       await _userManager.AddToRoleAsync(adminUser, "Admin");

       return tenant;

    }

    public async Task<bool> ActivateTenantAsync(Guid tenantId)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
            return false;

        tenant.IsActive = true;
        tenant.PaymentStatus = "Paid";
        tenant.PaymentActivatedAt = DateTime.UtcNow;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetCheckoutSessionAsync(Guid tenantId, string sessionId)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
            return false;

        tenant.PaymentStatus = "Pending";
        tenant.StripeCheckoutSessionId = sessionId;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkPaymentSucceededAsync(Guid tenantId, string? sessionId, string? subscriptionId)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
            return false;

        tenant.IsActive = true;
        tenant.PaymentStatus = "Paid";
        tenant.StripeCheckoutSessionId = sessionId ?? tenant.StripeCheckoutSessionId;
        tenant.StripeSubscriptionId = subscriptionId ?? tenant.StripeSubscriptionId;
        tenant.PaymentActivatedAt = DateTime.UtcNow;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }



    public async Task<bool> TenantExistAsync(string email)
    {
        return await _context.Tenants.AnyAsync(t=>t.Email.ToLower() == email.ToLower());
    }
     private async Task<string> GenerateUniqueSlugAsync(string name)
    {
        var baseSlug = GenerateSlug(name);
        var slug = baseSlug;
        var counter = 1;

        while (await SlugExistsAsync(slug))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }
    private string GenerateSlug(string name)
    {
        // Convert to lowercase
        var slug = name.ToLower();

        // Remove special characters
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");

        // Replace spaces with hyphens
        slug = Regex.Replace(slug, @"\s+", "-");

        // Remove multiple hyphens
        slug = Regex.Replace(slug, @"-+", "-");

        // Trim hyphens from start and end
        slug = slug.Trim('-');

        return slug;
    }

    public async Task<bool> SlugExistsAsync(string slug)
    {
       return await _context.Tenants.AnyAsync(s=>s.Slug.ToLower()==slug.ToLower());
    }

    public async Task<Tenant?> GetTenantByIdAsync(Guid id)
    {
       var tenant =await _context.Tenants.FirstOrDefaultAsync(p=>p.Id== id);
       if(tenant is null)
            throw new KeyNotFoundException("tenant with this id not found");
       return tenant;
    }

    public async Task<List<Tenant>> GetAllTenantAsync()
    {
        return await _context.Tenants.ToListAsync();
    }

    public async Task<Tenant?> UpdateTenantAsync(Guid id, UpdateTenantRequestDto updateTenantRequestDto)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t=>t.Id==id);
        if (tenant == null)
            throw new KeyNotFoundException("Tenant not found");
        tenant.Name = updateTenantRequestDto.Name;
        tenant.Email = updateTenantRequestDto.Email ?? tenant.Email;
        tenant.Phone = updateTenantRequestDto.Phone ?? tenant.Phone;
        tenant.Description = updateTenantRequestDto.Description ?? tenant.Description;
        tenant.TimeZone = updateTenantRequestDto.TimeZone ?? tenant.TimeZone;
        tenant.LogoUrl = updateTenantRequestDto.LogoUrl ?? tenant.LogoUrl;
        tenant.UpdatedAt = DateTime.UtcNow;
        tenant.WorkingHoursJson = updateTenantRequestDto.WorkingHours != null
               ? JsonSerializer.Serialize(updateTenantRequestDto.WorkingHours)
               : null;
        await _context.SaveChangesAsync();
        return tenant;
    }

    public async Task<bool> DeleteTenantAsync(Guid id)
    {
       var tenant = await _context.Tenants.FirstOrDefaultAsync(t=>t.Id==id);
        if (tenant == null)
            throw new KeyNotFoundException("Tenant not found");
        tenant.IsActive = false;
       tenant.UpdatedAt = DateTime.UtcNow;
       await _context.SaveChangesAsync();
       return true;
    }
}
