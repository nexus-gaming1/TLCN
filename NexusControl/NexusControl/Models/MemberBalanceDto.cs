using System.Text.Json.Serialization;

namespace NexusControl.Models
{
    public sealed class MemberBalanceDto
    {
        [JsonPropertyName("real_balance")]
        public decimal RealBalance { get; set; }

        [JsonPropertyName("bonus_balance")]
        public decimal BonusBalance { get; set; }
    }
}
