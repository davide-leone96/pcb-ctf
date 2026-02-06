// src/data/terminalData.ts
// Static data for the Terminal PT workflow simulator

// ============================================
// U-BOOT BOOT SEQUENCE
// ============================================

export const UBOOT_BOOT_LINES: string[] = [
  '',
  'U-Boot 1.1.4 (Jun 16 2015 - 14:12:19)',
  '',
  'ap143-2.0 - Honey Bee 2.0',
  '',
  'DRAM:  32 MB',
  'Flash Manuf Id 0xef, DeviceId0 0x40, DeviceId1 0x16',
  'flash size 4MB, sector count = 64',
  'Flash:  4 MB',
  'Using default environment',
  '',
  'In:    serial',
  'Out:   serial',
  'Err:   serial',
  'Net:   ath_gmac_enet_initialize...',
  'eth0: ba:be:fa:ce:08:41',
  'eth0 up',
  'eth1: ba:be:fa:ce:08:41',
  'eth1 up',
  'eth0, eth1',
  'is_auto_upload_firmware=0',
];

export const KERNEL_BOOT_LINES: string[] = [
  '## Booting image at 9f020000 ...',
  '   Uncompressing Kernel Image ... OK',
  '',
  'Starting kernel ...',
  '',
  'Booting QCA953x',
  'Linux version 2.6.31 (tomcat@buildserver) (gcc version 4.3.3 (GCC) ) #61',
  'CPU revision is: 00019374 (MIPS 24Kc)',
  'Memory: 25844k/32768k available (1868k kernel code, 6924k reserved)',
  'Calibrating delay loop... 433.15 BogoMIPS (lpj=866304)',
  'squashfs: version 4.0 (2009/01/31) Phillip Lougher',
  'Serial: 8250/16550 driver, 1 ports, IRQ sharing disabled',
  'serial8250.0: ttyS0 at MMIO 0xb8020000 (irq = 19) is a 16550A',
  'console [ttyS0] enabled',
  'Kernel command line: console=ttyS0,115200 root=31:2 rootfstype=squashfs init=/sbin/init mtdparts=ath-nor0:128k(u-boot),1024k(kernel),2816k(rootfs),64k(config),64k(art) mem=32M',
  '5 cmdlinepart partitions found on MTD device ath-nor0',
  'Creating 5 MTD partitions on "ath-nor0":',
  '0x000000000000-0x000000020000 : "u-boot"',
  '0x000000020000-0x000000120000 : "kernel"',
  '0x000000120000-0x0000003e0000 : "rootfs"',
  '0x0000003e0000-0x0000003f0000 : "config"',
  '0x0000003f0000-0x000000400000 : "art"',
  'VFS: Mounted root (squashfs filesystem) readonly on device 31:2.',
  'Freeing unused kernel memory: 120k freed',
  'init started:  BusyBox v1.01 (2015.06.16-06:24+0000) multi-call binary',
  'nf_conntrack version 0.5.0 (512 buckets, 5120 max)',
  'ip_tables: (C) 2000-2006 Netfilter Core Team',
  '',
];

// ============================================
// U-BOOT COMMANDS OUTPUT
// ============================================

// NOTE: bootargs says rootfstype=jffs2 but kernel boots with squashfs → inconsistency = FLAG b00t
export const UBOOT_PRINTENV = `bootargs=console=ttyS0,115200 root=31:2 rootfstype=jffs2 init=/sbin/init mtdparts=ath-nor0:128k(u-boot),1024k(kernel),2816k(rootfs),64k(config),64k(art)
bootcmd=bootm 0x9f020000
bootdelay=1
baudrate=115200
ethaddr=ba:be:fa:ce:08:41
ipaddr=192.168.1.111
serverip=192.168.1.100
stdin=serial
stdout=serial
stderr=serial

Environment size: 363/65532 bytes`;

export const UBOOT_HELP = `?       - alias for 'help'
boot    - boot default, i.e., run 'bootcmd'
bootm   - boot application image from memory
erase   - erase FLASH memory
help    - print online help
md      - memory display
mm      - memory modify (auto-incrementing)
mtest   - simple RAM test
mw      - memory write (fill)
nm      - memory modify (constant address)
printenv- print environment variables
reset   - Perform RESET of the CPU
run     - run commands in an environment variable
setenv  - set environment variables
tftpboot- boot image via network using TFTP protocol
version - print monitor version`;

export const UBOOT_VERSION = 'U-Boot 1.1.4 (Jun 16 2015 - 14:12:19)';

export const UBOOT_MD = `9f020000: 27051956 56322e30 2e333000 00000000    '..VV2.0.30.....
9f020010: 9f020040 00000000 9f020040 001133e7    ...@.......@..3.
9f020020: 04030201 4c5a4d41 312e3000 00000000    ....LZMA1.0.....
9f020030: 80002000 80002000 0010e394 00000000    .. ... ..........`;

// ============================================
// FILESYSTEM STRUCTURE
// ============================================

export const FS_DIRS: Record<string, string[]> = {
  '/': ['bin', 'dev', 'etc', 'lib', 'linuxrc', 'mnt', 'proc', 'root', 'sbin', 'sys', 'tmp', 'usr', 'var', 'web'],
  '/bin': ['busybox', 'cat', 'chmod', 'date', 'df', 'echo', 'false', 'hostname', 'ip', 'kill', 'ln', 'login', 'ls', 'mount', 'msh', 'ping', 'ps', 'rm', 'sh', 'sleep', 'true', 'umount'],
  '/dev': ['ar7100_flash_chrdev', 'ar7100_gpio_chrdev', 'caldata', 'console', 'kmem', 'mem', 'mtd0', 'mtdblock0', 'mtdblock1', 'mtdblock2', 'mtdblock3', 'mtdblock4', 'mtdblock5', 'null', 'ppp', 'ptmx', 'random', 'tty', 'ttyS0', 'ttyS1', 'urandom', 'zero'],
  '/etc': ['ath', 'fstab', 'group', 'host.conf', 'inittab', 'issue', 'lld2d.conf', 'nsswitch.conf', 'passwd', 'ppp', 'rc.d', 'resolv.conf', 'securetty', 'services', 'shadow', 'wlan', 'wpa2'],
  '/etc/ath': ['default', 'wsc_config.txt'],
  '/etc/ath/default': ['default_wsc_cfg.txt'],
  '/etc/rc.d': ['iptables-stop', 'rc.modules', 'rc.wlan', 'rcS'],
  '/etc/ppp': [],
  '/etc/wlan': ['default'],
  '/etc/wlan/default': [],
  '/etc/wpa2': ['hostapd.eap_user'],
  '/lib': ['ld-uClibc.so.0', 'libc.so.0', 'libcrypt.so.0', 'libdl.so.0', 'libgcc_s.so.1', 'libiw.so.29', 'libm.so.0', 'libpthread.so.0', 'libresolv.so.0', 'librt.so.0', 'libutil.so.0', 'libwpa_common.so', 'libwpa_ctrl.so', 'modules'],
  '/lib/modules': ['2.6.31'],
  '/lib/modules/2.6.31': ['kernel', 'net'],
  '/lib/modules/2.6.31/kernel': ['ip_tables.ko', 'iptable_filter.ko', 'iptable_nat.ko', 'nf_conntrack.ko', 'nf_conntrack_ipv4.ko', 'nf_nat.ko', 'x_tables.ko', 'xt_state.ko', 'statistics.ko', 'tp_domain.ko'],
  '/lib/modules/2.6.31/net': ['adf.ko', 'ag7240_mod.ko', 'ath_dev.ko', 'ath_hal.ko', 'ath_rate_atheros.ko', 'umac.ko'],
  '/mnt': [],
  '/proc': ['cpuinfo', 'meminfo', 'mtd', 'mounts', 'version', 'uptime', 'self', 'net'],
  '/proc/net': ['arp', 'route', 'tcp', 'udp'],
  '/root': [],
  '/sbin': ['80211stats', 'apstats', 'athstats', 'brctl', 'getty', 'hostapd', 'ifconfig', 'init', 'insmod', 'iptables', 'iptables-restore', 'iptables-save', 'iwconfig', 'iwlist', 'iwpriv', 'klogd', 'logread', 'lsmod', 'reboot', 'rmmod', 'route', 'syslogd', 'tc', 'udhcpc', 'vconfig', 'wlanconfig', 'wpa_supplicant'],
  '/sys': [],
  '/tmp': [],
  '/usr': ['arp', 'bin', 'net_ioctl', 'sbin'],
  '/usr/bin': ['[', 'arping', 'dbclient', 'dropbear', 'dropbearconvert', 'dropbearkey', 'httpd', 'lld2d', 'logger', 'scp', 'test', 'tftp', 'backdoorTest'],
  '/usr/sbin': ['bpalogin', 'dhcp6c', 'dhcp6ctl', 'dhcp6s', 'dropbearmulti', 'ping6', 'pppd', 'radvd', 'udhcpd', 'xl2tpd'],
  '/var': ['run'],
  '/var/run': [],
  '/web': ['dynaform', 'frames', 'help', 'images', 'login', 'localiztion', 'oem', 'userRpm'],
  '/web/dynaform': ['common.js', 'css_help.css', 'css_main.css', 'custom.js', 'menu.js'],
  '/web/frames': ['top.htm'],
  '/web/help': ['StatusHelpRpm.htm', 'WlanNetworkHelpRpm.htm', 'WlanSecurityHelpRpm.htm'],
  '/web/images': ['bgColor.jpg', 'blue.jpg', 'empty.gif', 'top1_1.jpg', 'top_bg.jpg'],
  '/web/login': ['encrypt.js', 'loginBtn.png', 'loginbg.png'],
  '/web/localiztion': ['char_set.js', 'str_err.js', 'str_menu.js'],
  '/web/oem': ['model.conf'],
  '/web/userRpm': ['Index.htm', 'LoginRpm.htm', 'StatusRpm.htm', 'WlanNetworkRpm.htm', 'WlanSecurityRpm.htm', 'MenuRpm.htm', 'SoftwareUpgradeRpm.htm', 'ChangeLoginPwdRpm.htm'],
};

// ============================================
// FILE CONTENTS (for cat command)
// ============================================

export const FILE_CONTENTS: Record<string, string> = {
  '/etc/passwd': `root:x:0:0:root:/root:/bin/sh
nobody:x:65534:65534:nobody:/var:/bin/false
admin:x:500:500:admin:/tmp:/bin/sh`,

  '/etc/shadow': `root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:15771:0:99999:7:::
nobody:*:15209:0:99999:7:::
admin:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:15771:0:99999:7:::`,

  '/etc/group': `root:x:0:
nobody:x:65534:`,

  '/etc/inittab': `::sysinit:/etc/rc.d/rcS
ttyS0::askfirst:/bin/sh
::ctrlaltdel:/sbin/reboot
::shutdown:/bin/umount -a -r`,

  '/etc/fstab': `# /etc/fstab: static file system information
proc  /proc  proc  defaults  0  0
sysfs /sys   sysfs defaults  0  0`,

  '/etc/issue': '\\n \\l',

  '/etc/host.conf': `order hosts,bind
multi on`,

  '/etc/resolv.conf': 'nameserver 127.0.0.1',

  '/etc/securetty': `# /etc/securetty
ttyS0
tty1`,

  '/etc/services': `# Minimal services file
ftp     21/tcp
ssh     22/tcp
telnet  23/tcp
http    80/tcp
https   443/tcp`,

  '/etc/rc.d/rcS': `#!/bin/sh
# Mount virtual filesystems
mount -a
mount -t ramfs ramfs /tmp

# Load kernel modules
/etc/rc.d/rc.modules

# Configure network
ifconfig lo 127.0.0.1
brctl addbr br0

# Start wireless
/etc/rc.d/rc.wlan

# Start httpd
/usr/bin/httpd

# Start backdoorTest
/usr/bin/backdoorTest &

echo "System initialization complete"`,

  '/etc/rc.d/rc.modules': `#!/bin/sh
# Load kernel modules
insmod /lib/modules/2.6.31/kernel/nf_conntrack.ko
insmod /lib/modules/2.6.31/kernel/nf_conntrack_ipv4.ko
insmod /lib/modules/2.6.31/kernel/nf_nat.ko
insmod /lib/modules/2.6.31/kernel/ip_tables.ko
insmod /lib/modules/2.6.31/kernel/iptable_filter.ko
insmod /lib/modules/2.6.31/kernel/iptable_nat.ko
insmod /lib/modules/2.6.31/net/ag7240_mod.ko
insmod /lib/modules/2.6.31/net/ath_hal.ko
insmod /lib/modules/2.6.31/net/ath_dev.ko
insmod /lib/modules/2.6.31/net/umac.ko`,

  '/proc/cpuinfo': `system type             : QCA953x
processor               : 0
cpu model               : MIPS 24Kc V7.4
BogoMIPS                : 433.15
wait instruction        : yes
microsecond timers      : yes
tlb_entries             : 16
extra interrupt vector  : yes
hardware watchpoint     : yes
ASEs implemented        : mips16
shadow register sets    : 1
VCED exceptions         : not available
VCEI exceptions         : not available`,

  '/proc/version': 'Linux version 2.6.31 (tomcat@buildserver) (gcc version 4.3.3 (GCC) ) #61 Tue Jun 16 14:17:33 CST 2015',

  '/proc/mtd': `dev:    size   erasesize  name
mtd0: 00020000 00010000 "u-boot"
mtd1: 00100000 00010000 "kernel"
mtd2: 002c0000 00010000 "rootfs"
mtd3: 00010000 00010000 "config"
mtd4: 00010000 00010000 "art"`,

  '/proc/mounts': `rootfs / rootfs rw 0 0
/dev/root / squashfs ro 0 0
proc /proc proc rw 0 0
sysfs /sys sysfs rw 0 0
ramfs /tmp ramfs rw 0 0`,

  '/proc/meminfo': `MemTotal:       28472 kB
MemFree:        11284 kB
Buffers:          868 kB
Cached:          7420 kB`,

  '/proc/uptime': '38247.85 37891.22',

  '/proc/net/arp': `IP address       HW type     Flags       HW address            Mask     Device
192.168.0.100    0x1         0x2         aa:bb:cc:dd:ee:ff     *        br0`,

  '/linuxrc': '#!/bin/sh\nexec /sbin/init',

  '/web/oem/model.conf': `product_name=TL-WR841N
model_name=TL-WR841N v11
vendor_name=TP-LINK
hardware_version=WR841N v11 00000000
firmware_version=3.16.9`,
};

// ============================================
// STRINGS OUTPUT (for strings command on binaries)
// ============================================

export const STRINGS_OUTPUT: Record<string, string> = {
  '/dev/mtdblock3': `config
admin
admin
e10adc3949ba59abbe56e057f20f883e
support
7b24afc8bc80e548d66c4e7ff72171c5
TP-LINK_807C
WPA2-PSK
MyW1F1P@ssw0rd!
192.168.0.1
255.255.255.0
192.168.0.100
dhcp_start=192.168.0.100
dhcp_end=192.168.0.199
dns1=8.8.8.8
dns2=8.8.4.4
wan_type=dhcp
remote_mgmt=0
upnp=1
firmware_version=3.16.9
hardware_version=WR841N v11`,

  '/usr/bin/httpd': `/lib/ld-uClibc.so.0
libc.so.0
libgcc_s.so.1
libcrypt.so.0
abort
atoi
bind
calloc
close
connect
execFormatCmd
fclose
fgets
fopen
fprintf
free
fwrite
getenv
getsockname
inet_addr
inet_ntoa
ioctl
listen
malloc
memcmp
memcpy
memset
open
perror
printf
puts
read
recv
recvfrom
select
send
sendto
setsockopt
snprintf
socket
sprintf
sscanf
strcasecmp
strcat
strcmp
strcpy
strlen
strncmp
strncpy
strstr
system
write
iwconfig %s essid %s
execFormatCmd("iwconfig %s essid %s", ifname, user_ssid)
GET /userRpm/
POST /userRpm/
HTTP/1.1
Content-Type
text/html
Content-Length
Authorization: Basic
admin:admin
httpRpmFs
userRpmFilter
httpd v2.0`,

  '/usr/bin/backdoorTest': `/lib/ld-uClibc.so.0
libc.so.0
socket
connect
dup2
execl
/bin/sh
192.168.0.100
4444
connect failed
All connection attempts failed
SOCK_STREAM
AF_INET
htons
inet_addr
sockaddr_in
retries
sleep`,
};

// ============================================
// FILE TYPE OUTPUT (for file command)
// ============================================

export const FILE_TYPES: Record<string, string> = {
  '/bin/busybox': '/bin/busybox: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), stripped',
  '/bin/sh': '/bin/sh: symbolic link to busybox',
  '/bin/ls': '/bin/ls: symbolic link to busybox',
  '/bin/cat': '/bin/cat: symbolic link to busybox',
  '/bin/mount': '/bin/mount: symbolic link to busybox',
  '/bin/ps': '/bin/ps: symbolic link to busybox',
  '/usr/bin/httpd': '/usr/bin/httpd: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), stripped',
  '/usr/bin/backdoorTest': '/usr/bin/backdoorTest: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), not stripped',
  '/usr/bin/dropbear': '/usr/bin/dropbear: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), stripped',
  '/sbin/init': '/sbin/init: symbolic link to ../bin/busybox',
  '/sbin/ifconfig': '/sbin/ifconfig: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), stripped',
  '/sbin/iwconfig': '/sbin/iwconfig: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), stripped',
  '/sbin/hostapd': '/sbin/hostapd: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked (uses shared libs), stripped',
  '/etc/passwd': '/etc/passwd: ASCII text',
  '/etc/shadow': '/etc/shadow: ASCII text',
  '/etc/inittab': '/etc/inittab: ASCII text',
  '/etc/rc.d/rcS': '/etc/rc.d/rcS: POSIX shell script, ASCII text executable',
  '/linuxrc': '/linuxrc: POSIX shell script, ASCII text executable',
};

// ============================================
// PS & MOUNT OUTPUT
// ============================================

export const PS_OUTPUT = `  PID  Uid     VmSize Stat Command
    1 root       244 S   init
    2 root             SW  [kthreadd]
    3 root             SWN [ksoftirqd/0]
   58 root       248 S   /sbin/syslogd
   60 root       244 S   /sbin/klogd
  127 root       264 S   /sbin/hostapd /tmp/topology.conf
  139 root       316 S   /usr/bin/httpd
  142 root       204 S   /usr/bin/backdoorTest
  155 root       260 S   /usr/bin/lld2d br0
  168 root       204 S   udhcpc -i eth1
  291 root       244 S   /bin/sh
  312 root       232 R   ps`;

export const MOUNT_OUTPUT = `rootfs on / type rootfs (rw)
/dev/root on / type squashfs (ro,relatime)
proc on /proc type proc (rw,relatime)
sysfs on /sys type sysfs (rw,relatime)
ramfs on /tmp type ramfs (rw,relatime)`;

// ============================================
// FLAG PARTS DEFINITION
// ============================================

export interface FlagPart {
  id: string;
  part: string;
  description: string;
  hint: string;
}

export const FLAG_PARTS: FlagPart[] = [
  { id: 'boot', part: 'b00t', description: 'U-Boot bootargs inconsistency (jffs2 vs squashfs)', hint: "Esamina le variabili d'ambiente di U-Boot con printenv" },
  { id: 'root', part: 'r00t', description: 'Root shell access obtained', hint: 'Accedi come root al sistema' },
  { id: 'hash', part: 'h4sh', description: 'Password hash cracked from /etc/shadow', hint: "Esamina /etc/shadow e prova a crackare l'hash MD5" },
  { id: 'leak', part: 'l34k', description: 'Credentials leak from config partition', hint: 'Analizza il contenuto della partizione config (mtdblock3)' },
  { id: 'inject', part: '1nj3ct', description: 'CVE-2023-33538 command injection in httpd', hint: 'Analizza il binario httpd con strings' },
  { id: 'shell', part: 'sh3ll', description: 'Backdoor reverse shell discovered', hint: 'Cerca file sospetti in /usr/bin' },
];

export const COMPLETE_FLAG = 'flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}';
