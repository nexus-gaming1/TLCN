using System.Text.Json.Serialization;

namespace NexusControl.Models
{
    public sealed class MemberBalanceDto
    {
        [JsonPropertyName("real_balance")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public decimal RealBalance { get; set; }

        [JsonPropertyName("bonus_balance")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public decimal BonusBalance { get; set; }
    }
}
