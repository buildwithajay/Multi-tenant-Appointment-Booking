using System;
using api.Domain.Models;
using api.src.Application.DTOs;
using api.src.Application.DTOs.TenantDto;

namespace api.src.Application.Interfaces;

public interface ITenantRepository
{
    Task<Tenant> CreateTenantAsync(CreateTenantDto createTenantDto);
    Task<bool> ActivateTenantAsync(Guid tenantId);
    Task<bool> TenantExistAsync(string email);
    Task<bool> SlugExistsAsync(string slug);
    Task<Tenant?> GetTenantByIdAsync(Guid Id);
    Task<List<Tenant>> GetAllTenantAsync();
    Task<Tenant?> UpdateTenantAsync(Guid Id, UpdateTenantRequestDto updateTenantRequestDto);
    Task<bool> DeleteTenantAsync(Guid Id);
    Task<bool> SetCheckoutSessionAsync(Guid tenantId, string sessionId);
    Task<bool> MarkPaymentSucceededAsync(Guid tenantId, string? sessionId, string? subscriptionId);
}
