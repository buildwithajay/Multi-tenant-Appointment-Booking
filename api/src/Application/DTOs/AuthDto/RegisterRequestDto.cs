using api.src.Domain.Enums;

namespace api.Application.DTOs;

public record RegisterRequestDto(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string Role,
    Guid TenantId
    
    
    );