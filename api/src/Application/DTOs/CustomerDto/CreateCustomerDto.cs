using System.ComponentModel.DataAnnotations;

namespace api.Application.DTOs.CustomerDto;

public record CreateCustomerDto
{
    public string? UserId { get; set; }

    [StringLength(100)]
    public string? Name { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }

    [StringLength(1000)] 
    public string? Notes { get; set; }
};
