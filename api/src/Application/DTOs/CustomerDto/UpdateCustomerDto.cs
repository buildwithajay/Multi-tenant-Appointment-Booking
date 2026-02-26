using System.ComponentModel.DataAnnotations;

namespace api.Application.DTOs.CustomerDto;

public record UpdateCustomerDto
{
    [StringLength(1000)] 
    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;
};