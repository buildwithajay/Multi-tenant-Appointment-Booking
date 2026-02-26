using System;
using api.Domain.Models;
using api.src.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.src.Infrastructure.Configurtions;

public class TenantConfiguration :IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.HasKey(t=>t.Id);
        builder.Property(t=>t.Name)
                .IsRequired()
                .HasMaxLength(200);
        builder.Property(t=>t.Slug)
                .IsRequired()
                .HasMaxLength(200);
        builder.HasIndex(t=>t.Slug).IsUnique();

        builder.HasMany(t=>t.Users)
                .WithOne(u=>u.Tenant)
                .HasForeignKey(u=>u.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
