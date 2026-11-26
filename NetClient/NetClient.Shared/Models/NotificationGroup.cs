using System;
using System.Collections.Generic;
using System.Text;

namespace NetClient.Shared.Models
{

public class NotificationGroup
{
        public string Type { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public List<NotificationItem> Items { get; set; } = new();

        public int Count => Items.Count;

        public int UnreadCount => Items.Count(x => !x.IsRead);
}
}
