namespace api.Application.DTOs.BookingDto;

public record PublicTenantCatalogDto
{
    public Guid TenantId { get; init; }
    public string TenantName { get; init; } = string.Empty;
    public string TenantSlug { get; init; } = string.Empty;
    public string? LogoUrl { get; init; }
    public string? Description { get; init; }
    public List<PublicServiceItemDto> Services { get; init; } = new();
    public List<PublicStaffItemDto> Staff { get; init; } = new();
}

public record PublicServiceItemDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public decimal Price { get; init; }
    public int DurationMinutes { get; init; }
}

public record PublicStaffItemDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public List<int> ServiceIds { get; init; } = new();
}
