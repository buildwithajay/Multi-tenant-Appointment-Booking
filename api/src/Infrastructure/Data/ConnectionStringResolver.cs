using Microsoft.Extensions.Configuration;
using Npgsql;

namespace api.Infrastructure.Data;

public static class ConnectionStringResolver
{
    public static string ResolveDefaultConnection(IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("DefaultConnection")
                  ?? configuration["ConnectionStrings:DefaultConnection"]
                  ?? configuration["ConnectionStrings__DefaultConnection"]
                  ?? configuration["DATABASE_URL"];

        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException("Database connection string is not configured.");

        return Normalize(raw.Trim());
    }

    private static string Normalize(string value)
    {
        if (LooksLikeUri(value))
            return BuildFromUri(value);

        var builder = new NpgsqlConnectionStringBuilder(value);
        builder.Host = CleanHost(builder.Host ?? string.Empty);

        if (builder.SslMode == SslMode.Disable || builder.SslMode == SslMode.Allow || builder.SslMode == SslMode.Prefer)
            builder.SslMode = SslMode.Require;

        return builder.ConnectionString;
    }

    private static bool LooksLikeUri(string value) =>
        value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
        value.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase);

    private static string BuildFromUri(string value)
    {
        var uriText = value.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase)
            ? $"postgresql://{value["tcp://".Length..]}"
            : value;

        var uri = new Uri(uriText);
        var userInfo = uri.UserInfo.Split(':', 2);
        var database = uri.AbsolutePath.Trim('/').Length == 0 ? "postgres" : uri.AbsolutePath.Trim('/');

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = CleanHost(uri.Host),
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = database,
            Username = Uri.UnescapeDataString(userInfo.Length > 0 ? userInfo[0] : string.Empty),
            Password = Uri.UnescapeDataString(userInfo.Length > 1 ? userInfo[1] : string.Empty),
            SslMode = SslMode.Require
        };

        return builder.ConnectionString;
    }

    private static string CleanHost(string host)
    {
        if (string.IsNullOrWhiteSpace(host))
            return host;

        var cleaned = host
            .Replace("tcp://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("postgres://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("postgresql://", "", StringComparison.OrdinalIgnoreCase)
            .Trim();

        var slashIndex = cleaned.IndexOf('/');
        if (slashIndex >= 0)
            cleaned = cleaned[..slashIndex];

        var colonCount = cleaned.Count(c => c == ':');
        if (colonCount == 1 && !cleaned.StartsWith('['))
            cleaned = cleaned.Split(':', 2)[0];

        return cleaned;
    }
}
