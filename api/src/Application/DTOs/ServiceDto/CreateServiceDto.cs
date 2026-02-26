using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace api.src.Application.DTOs.ServiceDto
{
    public record CreateServiceDto
    {
        [Required(ErrorMessage = "Service name is required")]
        [StringLength(200, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Price is required")]
        [Range(0, 99999, ErrorMessage = "Price must be between 0 and 99999")]
        public decimal Price { get; set; }

        [Required(ErrorMessage = "Duration is required")]
        [Range(5, 480, ErrorMessage = "Duration must be between 5 and 480 minutes")]
        public int DurationMinutes { get; set; }

        [StringLength(100)]
        public string? Category { get; set; }
    }
}