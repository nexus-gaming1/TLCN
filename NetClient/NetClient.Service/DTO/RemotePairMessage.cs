using System;
using System.Collections.Generic;
using System.Text;

namespace NetClient.Service.DTO
{
    public class RemotePairMessage
    {
        public string Pin { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
    }
}
