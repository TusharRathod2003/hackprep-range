import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Terminal, Award, Flame, CheckCircle2, AlertTriangle,
  Play, Square, HelpCircle, BookOpen, Clock, PlusCircle,
  Copy, Check, XCircle, Radio, Globe, Wifi, Server,
  Shield, Search, RefreshCw, Key, ChevronRight, FileText,
  Boxes, Cpu, HardDrive, Network, Layers, Code2, Eye,
  RotateCcw, Sliders, ExternalLink, Activity, Box, Database,
  Monitor, Send, Lock, Unlock, Settings, CornerDownLeft
} from 'lucide-react';

const SEED_TRACKS = [
  { id: 'recon', name: 'Reconnaissance & OSINT', description: 'Network mapping, service fingerprinting, and search engine intelligence', icon: Radio, count: 7, color: 'text-emerald-400' },
  { id: 'web', name: 'Web Application Defense', description: 'OWASP top 10 flaws, input validation, and session controls', icon: Globe, count: 6, color: 'text-cyan-400' },
  { id: 'network', name: 'Network Protocol Attacks', description: 'Layer 2/3 manipulation, spoofing attacks, and packet analysis', icon: Wifi, count: 5, color: 'text-amber-400' },
  { id: 'infra', name: 'Infrastructure & System Hardening', description: 'Proxies, load balancers, secure shell deployment, and monitoring', icon: Server, count: 6, color: 'text-purple-400' }
];

const SEED_LABS = [
  {
    id: 1,
    title: 'DoS Attack using Slow HTTP',
    trackId: 'network',
    difficulty: 'Medium',
    rewardXp: 120,
    hintCost: 25,
    docker: {
      image: 'hackrange/slow-http-target:latest',
      containerName: 'hr-lab-01-slowhttp',
      ports: ['80/tcp', '443/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  slowhttp-target:\n    image: httpd:2.4.52-alpine\n    container_name: hr-lab-01-slowhttp\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\n    deploy:\n      resources:\n        limits:\n          cpus: '0.50'\n          memory: 256M\nnetworks:\n  isolated_net:\n    internal: true\n    ipam:\n      config:\n        - subnet: 10.10.142.0/24`
    },
    manual: {
      objective: 'Demonstrate how low-rate application layer DoS (Slowloris/Slow HTTP POST) exhausts Apache connection pools, and configure mod_reqtimeout and proxy buffering to safeguard application availability.',
      setup: 'Dual-container Docker bridge network. Target: Apache 2.4.52 with mpm_worker enabled. Attacker: AttackBox container with slowhttptest and curl installed.',
      steps: [
        '1. Inspect open listener sockets on the target: curl -I http://10.10.142.50',
        '2. Examine active worker threads: ss -tan state established "( dport = :80 )"',
        '3. Simulate incomplete HTTP header exhaustion: slowhttptest -c 200 -H -i 10 -r 200 -t GET -u http://10.10.142.50/',
        '4. Observe HTTP 504 Gateway Timeout or dropped connections in client requests.',
        '5. Apply Apache mitigation: Load mod_reqtimeout and set RequestReadTimeout header=20-40,MinRate=500.'
      ],
      expectedOutcome: 'Without protection, connection threads remain occupied in ESTABLISHED state until MaxRequestWorkers is reached. Post-mitigation, Apache forcefully terminates connections failing to meet the minimum transfer rate.',
      bestPractices: 'Deploy reverse proxies (Nginx/HAProxy) in front of application pools to buffer incoming headers; enforce aggressive timeout windows with mod_reqtimeout in Apache; apply per-IP connection rate limiting.',
      cheatSheet: 'Check threads: ss -tan state established "( dport = :80 )" | Verify proxy timeouts: curl -I -m 5 http://10.10.142.50'
    },
    flag: 'THM{SL0W_HTTP_H3AD3R_3XHAUST1ON}',
    hint: 'Review mod_reqtimeout in Apache or client_body_timeout in Nginx to drop lingering incomplete connections.',
    tasks: [
      { id: 't1_1', title: 'Which Apache module protects against slow header attacks by enforcing minimum transfer rates?', answer: 'mod_reqtimeout', format: 'mod_**********' },
      { id: 't2_1', title: 'What is the default TCP port targeted during typical HTTP resource exhaustion attacks?', answer: '80', format: '**' },
      { id: 't3_1', title: 'Submit the completion flag discovered during reverse-proxy buffer testing:', answer: 'THM{SL0W_HTTP_H3AD3R_3XHAUST1ON}', format: 'THM{****************************}' }
    ]
  },
  {
    id: 2,
    title: 'SQL Injection',
    trackId: 'web',
    difficulty: 'Medium',
    rewardXp: 140,
    hintCost: 30,
    docker: {
      image: 'hackrange/dvwa-sqli:v1.3',
      containerName: 'hr-lab-02-sqli',
      ports: ['80/tcp', '3306/tcp'],
      memLimit: '512MB',
      cpuLimit: '0.75 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  sqli-app:\n    image: hackrange/dvwa-sqli:v1.3\n    container_name: hr-lab-02-sqli\n    environment:\n      - MYSQL_DATABASE=app_db\n      - MYSQL_USER=app_user\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Analyze dynamic query string concatenation flaws that allow authentication bypass and UNION data extraction; implement parameterized queries via PDO Prepared Statements.',
      setup: 'PHP 8.1 container running Apache paired with an internal MariaDB instance populated with mock corporate accounts and hash records.',
      steps: [
        '1. Access the test query portal: curl "http://10.10.142.50/login.php"',
        '2. Test basic tautology bypass payload: \' OR \'1\'=\'1',
        '3. Verify database version using UNION: \' UNION SELECT null, version(), null, null -- ',
        '4. Extract user records: \' UNION SELECT null, username, password, null FROM users -- ',
        '5. Refactor the backend code using PDO: $stmt = $pdo->prepare("SELECT * FROM users WHERE user = :u");'
      ],
      expectedOutcome: 'Unsanitized parameters alter SQL AST grammar, dumping records. With prepared statements applied, user input is strictly parsed as data literals.',
      bestPractices: 'Always enforce parameterized prepared statements or ORMs; grant least privilege database permissions; avoid displaying verbose database error messages in production.',
      cheatSheet: 'Tautology payload: \' OR 1=1 -- - | Extract DB: \' UNION SELECT 1,schema_name,3 FROM information_schema.schemata -- -'
    },
    flag: 'THM{PR3PAR3D_ST4T3M3NTS_S4V3_TH3_D4Y}',
    hint: 'Prepared statements guarantee that input is strictly treated as parameters rather than executable SQL syntax.',
    tasks: [
      { id: 't1_2', title: 'What classic SQL syntax injection bypasses passwords by forcing a true condition?', answer: "' OR '1'='1", format: "' ** '1'='1" },
      { id: 't2_2', title: 'Which defensive programming technique completely separates SQL syntax from user parameters?', answer: 'Prepared Statements', format: '******** **********' },
      { id: 't3_2', title: 'Submit the flag found inside the administrator user profile table:', answer: 'THM{PR3PAR3D_ST4T3M3NTS_S4V3_TH3_D4Y}', format: 'THM{*********************************}' }
    ]
  },
  {
    id: 3,
    title: 'HA Load Balancer',
    trackId: 'infra',
    difficulty: 'Medium',
    rewardXp: 130,
    hintCost: 25,
    docker: {
      image: 'haproxy:2.8-alpine',
      containerName: 'hr-lab-03-haproxy',
      ports: ['80/tcp', '8404/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  haproxy-lb:\n    image: haproxy:2.8-alpine\n    container_name: hr-lab-03-haproxy\n    volumes:\n      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Configure HAProxy to distribute traffic across a cluster of backend nodes, manage health checks, and observe automated failover recovery.',
      setup: 'HAProxy 2.8 container routing traffic to backend micro-service nodes with roundrobin balancing.',
      steps: [
        '1. Inspect HAProxy configuration: cat /usr/local/etc/haproxy/haproxy.cfg',
        '2. Verify round-robin responses: for i in {1..4}; do curl http://10.10.142.50; done',
        '3. Simulate backend crash: stop backend-srv1 container',
        '4. Query load balancer again: observe all requests seamlessly answered by Node Bravo',
        '5. Re-enable backend-srv1 and verify health checks restore it to active rotation'
      ],
      expectedOutcome: 'Requests alternate evenly between servers. When one container fails, HAProxy routes traffic to healthy nodes.',
      bestPractices: 'Pair HAProxy with Keepalived (VRRP); configure cookie persistence; enforce TLS termination at the proxy layer.',
      cheatSheet: 'Check syntax: haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg'
    },
    flag: 'THM{H4PR0XY_F41L0V3R_V3R1F13D}',
    hint: 'Look for the "balance roundrobin" directive in /etc/haproxy/haproxy.cfg.',
    tasks: [
      { id: 't1_3', title: 'Which load-balancing algorithm sequentially cycles requests across every healthy backend node in order?', answer: 'roundrobin', format: '**********' },
      { id: 't2_3', title: 'What parameter directive tells HAProxy to continuously probe the backend for reachability?', answer: 'check', format: '*****' },
      { id: 't3_3', title: 'Submit the load balancer health audit flag:', answer: 'THM{H4PR0XY_F41L0V3R_V3R1F13D}', format: 'THM{************************}' }
    ]
  },
  {
    id: 4,
    title: 'Backdoor Creation using Netcat',
    trackId: 'network',
    difficulty: 'Easy',
    rewardXp: 100,
    hintCost: 20,
    docker: {
      image: 'hackrange/netcat-sandbox:v1',
      containerName: 'hr-lab-04-netcat',
      ports: ['4444/tcp', '22/tcp'],
      memLimit: '128MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  netcat-target:\n    image: hackrange/netcat-sandbox:v1\n    container_name: hr-lab-04-netcat\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Inspect raw TCP listener sockets spawned with command-execution options and evaluate Linux auditd monitoring.',
      setup: 'Ubuntu minimal container with traditional netcat and Linux auditd logging framework enabled.',
      steps: [
        '1. Inspect open listening sockets on the target: ss -tulpn',
        '2. Identify process attached to port 4444: lsof -i :4444',
        '3. Connect to the listening socket: nc 10.10.142.50 4444',
        '4. Audit system execution calls: auditctl -l to review monitored execve rules',
        '5. Terminate the backdoor and configure iptables rules.'
      ],
      expectedOutcome: 'Connecting to port 4444 drops directly into an unauthenticated shell. Auditd logs show execve invocations.',
      bestPractices: 'Uninstall traditional netcat builds with -e; enforce strict egress filtering; monitor process spawns with auditd or eBPF.',
      cheatSheet: 'Audit open sockets: ss -tulpn | Detect process: fuser 4444/tcp'
    },
    flag: 'THM{N3TCAT_L1ST3N3R_B1ND_SH3LL}',
    hint: 'The -e parameter binds a program such as /bin/bash directly to an open listening port.',
    tasks: [
      { id: 't1_4', title: 'Which Netcat switch executes a specified shell program upon receiving an inbound connection?', answer: '-e', format: '-*' },
      { id: 't2_4', title: 'Which Linux logging framework monitors process execution (execve system calls) to detect backdoors?', answer: 'auditd', format: '******' },
      { id: 't3_4', title: 'Submit the socket binding verification flag:', answer: 'THM{N3TCAT_L1ST3N3R_B1ND_SH3LL}', format: 'THM{**************************}' }
    ]
  },
  {
    id: 5,
    title: 'MRTG Windows',
    trackId: 'infra',
    difficulty: 'Easy',
    rewardXp: 90,
    hintCost: 20,
    docker: {
      image: 'hackrange/snmp-target:latest',
      containerName: 'hr-lab-05-snmp',
      ports: ['161/udp', '80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  snmp-node:\n    image: hackrange/snmp-target:latest\n    container_name: hr-lab-05-snmp\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Query SNMP v2c/v3 service agents and poll interface MIB counters using Multi Router Traffic Grapher (MRTG).',
      setup: 'Net-SNMP daemon configured with simulated Windows host OID mappings and MRTG graph generation utilities.',
      steps: [
        '1. Test reachability of the SNMP agent: snmpwalk -v2c -c public 10.10.142.50 system',
        '2. Poll interface traffic octets: snmpget -v2c -c public 10.10.142.50 1.3.6.1.2.1.2.2.1.10.1',
        '3. Generate MRTG configuration: cfgmaker public@10.10.142.50 --output mrtg.cfg',
        '4. Build HTML graphs: perl mrtg mrtg.cfg',
        '5. Inspect generated bandwidth reports on web server: curl http://10.10.142.50/mrtg/'
      ],
      expectedOutcome: 'MRTG successfully queries interface octet counters and renders throughput charts.',
      bestPractices: 'Migrate legacy SNMPv1/v2c configurations to SNMPv3 with SHA-256 and AES encryption; restrict access with firewall rules.',
      cheatSheet: 'Walk OID tree: snmpwalk -v2c -c public 10.10.142.50'
    },
    flag: 'THM{SNMP_MRTG_TRAFF1C_M0N1T0R}',
    hint: 'Legacy installations frequently leave the "public" read-only community string open on UDP port 161.',
    tasks: [
      { id: 't1_5', title: 'What standard UDP port is used by the SNMP agent daemon to answer poll queries?', answer: '161', format: '***' },
      { id: 't2_5', title: 'Which SNMP version supports cryptographic authentication and AES privacy encryption?', answer: 'SNMPv3', format: '******' },
      { id: 't3_5', title: 'Submit the MRTG bandwidth monitor validation flag:', answer: 'THM{SNMP_MRTG_TRAFF1C_M0N1T0R}', format: 'THM{**************************}' }
    ]
  },
  {
    id: 6,
    title: 'File Inclusion (LFI)',
    trackId: 'web',
    difficulty: 'Medium',
    rewardXp: 140,
    hintCost: 30,
    docker: {
      image: 'hackrange/lfi-vulnerable-php:latest',
      containerName: 'hr-lab-06-lfi',
      ports: ['80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  lfi-target:\n    image: hackrange/lfi-vulnerable-php:latest\n    container_name: hr-lab-06-lfi\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Analyze Local File Inclusion flaws where untrusted user input is passed directly to internal filesystem functions like include().',
      setup: 'PHP web container with deliberate directory traversal vulnerability and simulated /etc/passwd.',
      steps: [
        '1. Test basic navigation endpoint: curl "http://10.10.142.50/index.php?page=home.php"',
        '2. Execute path traversal sequence: curl "http://10.10.142.50/index.php?page=../../../../etc/passwd"',
        '3. Use PHP filter wrapper: curl "http://10.10.142.50/index.php?page=php://filter/convert.base64-encode/resource=config.php"',
        '4. Decode base64 to read configuration secrets.',
        '5. Implement whitelist defensive coding to restrict input.'
      ],
      expectedOutcome: 'System files are exposed in plaintext through traversal until strict file allowlisting is enforced.',
      bestPractices: 'Enforce an explicit allowlist of valid pages; disable allow_url_include and allow_url_fopen in php.ini.',
      cheatSheet: 'LFI Traversal: ../../../../etc/passwd'
    },
    flag: 'THM{L0C4L_F1L3_1NCLUS10N_B4S1CS}',
    hint: 'Use path traversal sequences like ../../../../etc/passwd to escape the web root.',
    tasks: [
      { id: 't1_6', title: 'What character sequence traverses upward into the parent folder within a filesystem path?', answer: '../', format: '***' },
      { id: 't2_6', title: 'Which php.ini directive controls whether remote URLs can be included by file functions?', answer: 'allow_url_include', format: '*****************' },
      { id: 't3_6', title: 'Submit the flag retrieved from the simulated /etc/passwd file:', answer: 'THM{L0C4L_F1L3_1NCLUS10N_B4S1CS}', format: 'THM{*****************************}' }
    ]
  },
  {
    id: 7,
    title: 'Squid Proxy',
    trackId: 'infra',
    difficulty: 'Medium',
    rewardXp: 120,
    hintCost: 25,
    docker: {
      image: 'sameersbn/squid:3.5.27',
      containerName: 'hr-lab-07-squid',
      ports: ['3128/tcp'],
      memLimit: '384MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  squid-proxy:\n    image: sameersbn/squid:3.5.27\n    container_name: hr-lab-07-squid\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Configure and audit Squid as a caching forward proxy, setting up Access Control Lists (ACLs) to regulate outbound traffic.',
      setup: 'Squid 3.5 forward caching proxy configured to listen on TCP port 3128 with domain and subnet ACL definitions.',
      steps: [
        '1. Inspect Squid configuration: cat /etc/squid/squid.conf | grep -E "acl|http_access"',
        '2. Test routing through proxy: curl -x http://10.10.142.50:3128 -I http://example.com/',
        '3. Test blocked destination: curl -x http://10.10.142.50:3128 -I http://malicious-test.internal/',
        '4. Observe 403 Forbidden Squid error page generated by ACL filter.',
        '5. Monitor live proxy queries: tail -f /var/log/squid/access.log'
      ],
      expectedOutcome: 'Authorized subnets are successfully proxied and cached, while connections matching blacklisted domain ACLs receive HTTP 403 Forbidden.',
      bestPractices: 'Ensure "http_access deny all" terminates ruleset; forward logs to central SIEM.',
      cheatSheet: 'Check syntax: squid -k check'
    },
    flag: 'THM{SQU1D_PR0XY_F1LT3R_RULESET}',
    hint: 'Check /etc/squid/squid.conf for http_access allow and acl directives.',
    tasks: [
      { id: 't1_7', title: 'What is the default TCP listening port configured on standard Squid proxy installations?', answer: '3128', format: '****' },
      { id: 't2_7', title: 'What keyword defines filter criteria such as subnets or target domains in squid.conf?', answer: 'acl', format: '***' },
      { id: 't3_7', title: 'Submit the Squid proxy ACL enforcement flag:', answer: 'THM{SQU1D_PR0XY_F1LT3R_RULESET}', format: 'THM{***************************}' }
    ]
  },
  {
    id: 8,
    title: 'ARP Spoofing',
    trackId: 'network',
    difficulty: 'Medium',
    rewardXp: 150,
    hintCost: 35,
    docker: {
      image: 'hackrange/arp-lab-mesh:v1',
      containerName: 'hr-lab-08-arpmesh',
      ports: ['80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  gateway-sim:\n    image: alpine\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.1\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Examine Address Resolution Protocol vulnerabilities on local Ethernet segments and evaluate Dynamic ARP Inspection (DAI).',
      setup: 'Two simulated Linux endpoints connected across the internal Docker bridge network.',
      steps: [
        '1. Inspect local ARP cache: arp -a',
        '2. Observe normal gateway MAC resolution.',
        '3. Transmit simulated gratuitous ARP frames to victim.',
        '4. Observe poisoned ARP table remapping IP to testing MAC.',
        '5. Enable switch security: Configure Dynamic ARP Inspection (DAI) and DHCP Snooping.'
      ],
      expectedOutcome: 'Without DAI, hosts accept unauthenticated ARP replies. With DAI enabled, switches drop forged frames.',
      bestPractices: 'Enable Dynamic ARP Inspection (DAI) paired with DHCP Snooping on all managed switch access ports.',
      cheatSheet: 'View ARP table: ip neigh show'
    },
    flag: 'THM{DYN4MIC_4RP_1NSP3CT10N_D3F3ND}',
    hint: 'Dynamic ARP Inspection relies on the DHCP snooping binding database to discard forged ARP responses.',
    tasks: [
      { id: 't1_8', title: 'Which managed switch security feature checks ARP frames against the DHCP snooping table?', answer: 'Dynamic ARP Inspection', format: '******* *** **********' },
      { id: 't2_8', title: 'What OSI layer does the Address Resolution Protocol operate on?', answer: 'Data Link Layer', format: '**** **** *****' },
      { id: 't3_8', title: 'Submit the network protocol audit flag:', answer: 'THM{DYN4MIC_4RP_1NSP3CT10N_D3F3ND}', format: 'THM{*****************************}' }
    ]
  },
  {
    id: 9,
    title: 'Converting HTTP to HTTPS',
    trackId: 'infra',
    difficulty: 'Easy',
    rewardXp: 110,
    hintCost: 20,
    docker: {
      image: 'nginx:1.25-alpine',
      containerName: 'hr-lab-09-nginx-tls',
      ports: ['80/tcp', '443/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  nginx-tls:\n    image: nginx:1.25-alpine\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Create private keys and X.509 certificates with OpenSSL, configure TLS termination in Nginx, and enforce 301 HTTPS redirection with HSTS.',
      setup: 'Nginx 1.25 container listening on ports 80 and 443 with self-signed certificate generation utilities.',
      steps: [
        '1. Generate 2048-bit RSA key and X.509 certificate: openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/server.key -out /etc/ssl/certs/server.crt',
        '2. Edit /etc/nginx/conf.d/default.conf to add port 443 listener with ssl_certificate directives.',
        '3. Add HTTP port 80 redirection block: return 301 https://$host$request_uri;',
        '4. Test configuration and reload: nginx -t && nginx -s reload',
        '5. Verify TLS handshake using OpenSSL: openssl s_client -connect 10.10.142.50:443 -tls1_3'
      ],
      expectedOutcome: 'Port 80 traffic automatically redirects to port 443 via HTTP 301. Connections establish an encrypted TLS 1.3 session.',
      bestPractices: 'Disable deprecated SSLv3, TLS 1.0, and TLS 1.1; enforce strong AEAD cipher suites; deploy HSTS with includeSubDomains.',
      cheatSheet: 'Audit TLS Handshake: openssl s_client -connect 10.10.142.50:443'
    },
    flag: 'THM{TLS_C3RT1F1C4T3_3NCRYPT10N}',
    hint: 'The Strict-Transport-Security header prevents downgrade attacks by instructing browsers to exclusively use HTTPS.',
    tasks: [
      { id: 't1_9', title: 'What standard TCP port handles TLS-encrypted HTTPS web traffic?', answer: '443', format: '***' },
      { id: 't2_9', title: 'Which security header commands browsers to communicate exclusively over HTTPS in the future?', answer: 'Strict-Transport-Security', format: '************************' },
      { id: 't3_9', title: 'Submit the HTTPS handshake verification flag:', answer: 'THM{TLS_C3RT1F1C4T3_3NCRYPT10N}', format: 'THM{**************************}' }
    ]
  },
  {
    id: 10,
    title: 'Broken Authentication',
    trackId: 'web',
    difficulty: 'Medium',
    rewardXp: 130,
    hintCost: 25,
    docker: {
      image: 'hackrange/broken-auth-lab:latest',
      containerName: 'hr-lab-10-auth',
      ports: ['80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  auth-lab:\n    image: hackrange/broken-auth-lab:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Identify weaknesses in login mechanisms, predictable session IDs, missing account lockout, and insecure password recovery workflows.',
      setup: 'Web application container with predictable incremental session identifiers and unthrottled login forms.',
      steps: [
        '1. Inspect session identifiers issued upon login: curl -i http://10.10.142.50/login.php -d "user=test&pass=test"',
        '2. Notice sequential ID generation (e.g. SESSID=1001, 1002).',
        '3. Test lack of brute force throttling by running credential spray loop.',
        '4. Implement cryptographic 128-bit session tokens.',
        '5. Call session_regenerate_id() immediately upon successful authentication.'
      ],
      expectedOutcome: 'Predictable session cookies allow unauthorized account takeover. Implementing randomized session tokens eliminates the vulnerability.',
      bestPractices: 'Enforce Multi-Factor Authentication (MFA); regenerate session tokens on privilege change; set HttpOnly, Secure, and SameSite=Strict cookie flags.',
      cheatSheet: 'Check cookie flags: curl -i http://10.10.142.50/login'
    },
    flag: 'THM{AUTH3NT1C4T10N_S3SS10N_H4RD3N}',
    hint: 'Session IDs must have high entropy (at least 128 bits of randomness) and be regenerated after successful login.',
    tasks: [
      { id: 't1_10', title: 'Which PHP function generates a new session identifier to eliminate session fixation flaws?', answer: 'session_regenerate_id', format: '*********************' },
      { id: 't2_10', title: 'What security control requires an additional time-based verification code besides password?', answer: 'Multi-Factor Authentication', format: '************ **************' },
      { id: 't3_10', title: 'Submit the authentication verification token:', answer: 'THM{AUTH3NT1C4T10N_S3SS10N_H4RD3N}', format: 'THM{******************************}' }
    ]
  },
  {
    id: 11,
    title: 'Password Cracking using Hydra',
    trackId: 'network',
    difficulty: 'Medium',
    rewardXp: 140,
    hintCost: 30,
    docker: {
      image: 'hackrange/ftp-ssh-target:latest',
      containerName: 'hr-lab-11-hydratarget',
      ports: ['21/tcp', '22/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  target-services:\n    image: hackrange/ftp-ssh-target:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Use THC-Hydra to audit password strength across exposed services and configure Fail2ban to mitigate automated brute force.',
      setup: 'Target container running vsftpd and OpenSSH with mock accounts, paired with Fail2ban monitoring daemon.',
      steps: [
        '1. Inspect target service banners: nc -vn 10.10.142.50 21',
        '2. Run dictionary audit against test FTP account: hydra -l admin -P wordlist.txt 10.10.142.50 ftp',
        '3. Monitor authentication attempts in target logs: tail -f /var/log/auth.log',
        '4. Observe Fail2ban automatically triggering an iptables DROP rule after 3 failed attempts.',
        '5. Verify jail status: fail2ban-client status sshd'
      ],
      expectedOutcome: 'Weak passwords fall rapidly to wordlist audits. With Fail2ban active, attacker IPs are banned.',
      bestPractices: 'Deploy Fail2ban or CrowdSec; mandate public-key authentication for SSH; disable root remote login.',
      cheatSheet: 'Audit FTP: hydra -l user -P pass.txt 10.10.142.50 ftp'
    },
    flag: 'THM{HYDR4_D1CT10N4RY_4UD1T_C0MPL3T3}',
    hint: 'Hydra uses the -P switch for password wordlists and -l for single usernames.',
    tasks: [
      { id: 't1_11', title: 'Which Hydra flag switch specifies a wordlist file containing passwords? (Format: -X)', answer: '-P', format: '-*' },
      { id: 't2_11', title: 'Which automated intrusion prevention daemon bans IPs showing repeated authentication failures?', answer: 'fail2ban', format: '********' },
      { id: 't3_11', title: 'Submit the cracked service validation flag:', answer: 'THM{HYDR4_D1CT10N4RY_4UD1T_C0MPL3T3}', format: 'THM{********************************}' }
    ]
  },
  {
    id: 12,
    title: 'SQL Mapping',
    trackId: 'web',
    difficulty: 'Medium',
    rewardXp: 130,
    hintCost: 25,
    docker: {
      image: 'hackrange/sqlmap-sandbox:latest',
      containerName: 'hr-lab-12-sqlmap',
      ports: ['80/tcp'],
      memLimit: '384MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  sqlmap-target:\n    image: hackrange/sqlmap-sandbox:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Automate SQL injection vulnerability assessment using sqlmap to identify DBMS versions and enumerate database schemas.',
      setup: 'PHP application with a parameter vulnerable to blind SQL injection, connected to an internal SQLite database.',
      steps: [
        '1. Probe vulnerable query endpoint: sqlmap -u "http://10.10.142.50/search.php?id=1" --batch',
        '2. Enumerate available databases: sqlmap -u "http://10.10.142.50/search.php?id=1" --dbs --batch',
        '3. Enumerate tables: sqlmap -u "http://10.10.142.50/search.php?id=1" -D app_db --tables --batch',
        '4. Dump mock users table: sqlmap -u "http://10.10.142.50/search.php?id=1" -D app_db -T users --dump --batch',
        '5. Apply parameterized queries to the vulnerable code.'
      ],
      expectedOutcome: 'Sqlmap detects Boolean-blind and Error-based vectors, dumping target schemas. After parameterization, queries are secure.',
      bestPractices: 'Apply database least privilege; parameterize queries; deploy Web Application Firewalls (ModSecurity/Coraza).',
      cheatSheet: 'Run automated probe: sqlmap -u "http://target/page.php?id=1" --batch'
    },
    flag: 'THM{SQLM4P_4UT0M4T3D_DUMPER}',
    hint: 'Use the --batch option to automatically accept default prompt choices.',
    tasks: [
      { id: 't1_12', title: 'Which sqlmap flag accepts all default prompt values without user interaction?', answer: '--batch', format: '--*****' },
      { id: 't2_12', title: 'Which switch tells sqlmap to enumerate all available database names?', answer: '--dbs', format: '--***' },
      { id: 't3_12', title: 'Submit the SQL mapping verification token:', answer: 'THM{SQLM4P_4UT0M4T3D_DUMPER}', format: 'THM{***********************}' }
    ]
  },
  {
    id: 13,
    title: 'User Agent Changing',
    trackId: 'recon',
    difficulty: 'Easy',
    rewardXp: 90,
    hintCost: 20,
    docker: {
      image: 'hackrange/ua-switch-app:latest',
      containerName: 'hr-lab-13-useragent',
      ports: ['80/tcp'],
      memLimit: '128MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  ua-app:\n    image: hackrange/ua-switch-app:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Understand how web servers behave differently based on HTTP User-Agent strings and why relying on client-supplied headers for access control is flawed.',
      setup: 'Lightweight web server inspecting User-Agent header to deliver custom mobile versions or restrict sensitive routes.',
      steps: [
        '1. Inspect standard response with curl: curl http://10.10.142.50/internal-portal',
        '2. Notice 403 Forbidden message indicating unauthorized client type.',
        '3. Spoof authorized Googlebot crawler: curl -A "Googlebot/2.1" http://10.10.142.50/internal-portal',
        '4. Observe page granting access because it naively trusts header.',
        '5. Implement server-side session authentication rather than header inspection.'
      ],
      expectedOutcome: 'Changing User-Agent header bypasses naive client-side controls. Enforcing cryptographic session authentication eliminates the flaw.',
      bestPractices: 'Never trust client-supplied HTTP headers for access control decisions; enforce cryptographic token validation.',
      cheatSheet: 'Set User-Agent: curl -A "CustomAgent/1.0" http://10.10.142.50'
    },
    flag: 'THM{US3R_4G3NT_SP00F1NG_4UD1T}',
    hint: 'In curl, the -A switch overrides the client User-Agent string.',
    tasks: [
      { id: 't1_13', title: 'Which curl command-line switch sets a custom User-Agent string? (Format: -X)', answer: '-A', format: '-*' },
      { id: 't2_13', title: 'True or False: HTTP headers can be securely trusted for access control without cryptographic tokens?', answer: 'False', format: '*****' },
      { id: 't3_13', title: 'Submit the hidden portal token received after crawler spoofing:', answer: 'THM{US3R_4G3NT_SP00F1NG_4UD1T}', format: 'THM{***************************}' }
    ]
  },
  {
    id: 14,
    title: 'Nmap Scan Network',
    trackId: 'recon',
    difficulty: 'Easy',
    rewardXp: 100,
    hintCost: 20,
    docker: {
      image: 'hackrange/multiservice-node:v2',
      containerName: 'hr-lab-14-nmapnode',
      ports: ['22/tcp', '80/tcp', '443/tcp', '3128/tcp'],
      memLimit: '384MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  multisvc:\n    image: hackrange/multiservice-node:v2\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Send crafted TCP/UDP packets across a virtual subnet to discover live hosts, identify open listening ports, and fingerprint software versions.',
      setup: 'Ubuntu container exposing SSH (port 22), Apache (port 80/443), and Squid (port 3128).',
      steps: [
        '1. Ping sweep subnet: nmap -sn 10.10.142.0/24',
        '2. Perform TCP SYN stealth scan: sudo nmap -sS -p- --min-rate 1000 10.10.142.50',
        '3. Detect software service versions: nmap -sV -p 22,80,443,3128 10.10.142.50',
        '4. Run default NSE vulnerability scripts: nmap -sC -p 80 10.10.142.50',
        '5. Configure iptables to silently drop unauthorized SYN packets.'
      ],
      expectedOutcome: 'Nmap outputs exact open ports and service versions. Defensive firewall rules mitigate scanning noise.',
      bestPractices: 'Close unused ports and services; use host firewalls to drop packets silently; deploy IDS/IPS to detect port scans.',
      cheatSheet: 'SYN Scan: nmap -sS -sV 10.10.142.50'
    },
    flag: 'THM{SYN_ST3ALTH_SCAN_C0MPL3T3}',
    hint: 'The -sS switch conducts a TCP SYN stealth scan without completing the three-way handshake.',
    tasks: [
      { id: 't1_14', title: 'Which Nmap flag switch initiates a TCP SYN stealth scan? (Format: -XX)', answer: '-sS', format: '-**' },
      { id: 't2_14', title: 'What Apache service version is listening on HTTP port 80 of the target?', answer: '2.4.52', format: '*.*.**' },
      { id: 't3_14', title: 'Submit the final room completion flag found in the service inspection:', answer: 'THM{SYN_ST3ALTH_SCAN_C0MPL3T3}', format: 'THM{****************************}' }
    ]
  },
  {
    id: 15,
    title: 'MAC Spoof',
    trackId: 'network',
    difficulty: 'Easy',
    rewardXp: 80,
    hintCost: 15,
    docker: {
      image: 'hackrange/mac-switchport-lab:latest',
      containerName: 'hr-lab-15-macspoof',
      ports: ['80/tcp'],
      memLimit: '128MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  mac-test:\n    image: hackrange/mac-switchport-lab:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Inspect Layer 2 hardware MAC addresses on Linux network interfaces and evaluate switchport security configurations (sticky MAC filtering).',
      setup: 'Container with iproute2 tools and mock access switch environment enforcing Port Security rules.',
      steps: [
        '1. Inspect active interface MAC: ip link show eth0',
        '2. Take interface down: ip link set dev eth0 down',
        '3. Assign temporary hardware MAC address: ip link set dev eth0 address 00:11:22:33:44:55',
        '4. Bring interface back up: ip link set dev eth0 up',
        '5. Observe switchport security violation shutting down the port when an unapproved MAC is detected.'
      ],
      expectedOutcome: 'Linux successfully updates the link-layer hardware address in memory. Managed switches with Port Security drop frames with unauthorized MACs.',
      bestPractices: 'Deploy switchport port-security with sticky MAC learning; configure violation shutdown on access ports.',
      cheatSheet: 'View MAC: ip link show | Change MAC: ip link set dev eth0 address 00:11:22:33:44:55'
    },
    flag: 'THM{M4C_4DDR3SS_SP00F_V3R1F13D}',
    hint: 'A standard IEEE 802 MAC address consists of 6 hexadecimal octets (48 bits).',
    tasks: [
      { id: 't1_15', title: 'How many bytes (octets) comprise a standard IEEE 802 MAC address?', answer: '6', format: '*' },
      { id: 't2_15', title: 'Which Cisco switchport security feature memorizes learned MAC addresses dynamically?', answer: 'sticky', format: '******' },
      { id: 't3_15', title: 'Submit the link-layer audit confirmation token:', answer: 'THM{M4C_4DDR3SS_SP00F_V3R1F13D}', format: 'THM{***************************}' }
    ]
  },
  {
    id: 16,
    title: 'XSS Attack',
    trackId: 'web',
    difficulty: 'Medium',
    rewardXp: 130,
    hintCost: 25,
    docker: {
      image: 'hackrange/xss-defense-lab:latest',
      containerName: 'hr-lab-16-xss',
      ports: ['80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  xss-lab:\n    image: hackrange/xss-defense-lab:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Examine Reflected and Stored Cross-Site Scripting (XSS) and implement Content Security Policy (CSP).',
      setup: 'PHP web container featuring an unescaped guestbook form and reflected search bar.',
      steps: [
        '1. Test reflected parameter: curl "http://10.10.142.50/search.php?q=<script>alert(1)</script>"',
        '2. Observe unencoded script returned directly in HTML response.',
        '3. Test attribute injection: "><img src=x onerror=alert(document.cookie)>',
        '4. Implement output encoding using htmlspecialchars($q, ENT_QUOTES, "UTF-8").',
        '5. Configure Content-Security-Policy header: Content-Security-Policy: default-src \'self\';'
      ],
      expectedOutcome: 'Injected JavaScript executes until context-aware output encoding is applied and CSP blocks unauthorized scripts.',
      bestPractices: 'Apply context-aware output encoding; enforce strict Content Security Policy (CSP); mark session cookies with HttpOnly and Secure.',
      cheatSheet: 'Basic POC: <script>alert(1)</script>'
    },
    flag: 'THM{CR0SS_S1T3_SCR1PT1NG_D3F3NS3}',
    hint: 'The HttpOnly cookie flag blocks document.cookie access from client-side JavaScript.',
    tasks: [
      { id: 't1_16', title: 'Which cookie flag prohibits client-side JavaScript from reading session cookies via document.cookie?', answer: 'HttpOnly', format: '********' },
      { id: 't2_16', title: 'What modern HTTP security header restricts sources of scripts and resources allowed to execute?', answer: 'Content-Security-Policy', format: '***********************' },
      { id: 't3_16', title: 'Submit the XSS defense verification flag:', answer: 'THM{CR0SS_S1T3_SCR1PT1NG_D3F3NS3}', format: 'THM{********************************}' }
    ]
  },
  {
    id: 17,
    title: 'Gobuster, Dirbuster',
    trackId: 'recon',
    difficulty: 'Easy',
    rewardXp: 100,
    hintCost: 20,
    docker: {
      image: 'hackrange/hidden-dirs-web:latest',
      containerName: 'hr-lab-17-gobuster',
      ports: ['80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  hidden-web:\n    image: hackrange/hidden-dirs-web:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Brute-force URI paths against a wordlist to locate hidden administration panels, backup archives, and unlinked endpoints.',
      setup: 'Apache web container populated with unlinked directories like /admin, /backup.zip, and /secret.',
      steps: [
        '1. Inspect web root: curl -I http://10.10.142.50/',
        '2. Run directory brute-force with Gobuster: gobuster dir -u http://10.10.142.50/ -w wordlist.txt -x php,txt,bak',
        '3. Inspect discovered 200 OK and 301 Redirect paths.',
        '4. Extract credentials from the discovered backup archive.',
        '5. Harden web server configuration with Options -Indexes and restrict sensitive routes.'
      ],
      expectedOutcome: 'Gobuster enumerates hidden files. Disabling directory indexes prevents unauthorized browsing.',
      bestPractices: 'Disable directory indexing (Options -Indexes in Apache); keep backups outside public document roots.',
      cheatSheet: 'Directory brute-force: gobuster dir -u http://10.10.142.50/ -w wordlist.txt -x php,html,txt'
    },
    flag: 'THM{D1R3CT0RY_3NUM_S3CR3T_V4ULT}',
    hint: 'The -x switch allows Gobuster to append extensions like php, txt, or bak to each wordlist item.',
    tasks: [
      { id: 't1_17', title: 'Which Gobuster mode switch initiates directory and file brute-forcing?', answer: 'dir', format: '***' },
      { id: 't2_17', title: 'Which switch appends file extensions such as txt or php to wordlist requests?', answer: '-x', format: '-*' },
      { id: 't3_17', title: 'Submit the flag located in the discovered backup directory path:', answer: 'THM{D1R3CT0RY_3NUM_S3CR3T_V4ULT}', format: 'THM{*****************************}' }
    ]
  },
  {
    id: 18,
    title: 'Practical Exam Slot #18 (Specialized Lab)',
    trackId: 'infra',
    difficulty: 'Hard',
    rewardXp: 180,
    hintCost: 35,
    docker: {
      image: 'hackrange/capstone-exam-node:v1',
      containerName: 'hr-lab-18-capstone',
      ports: ['22/tcp', '80/tcp', '8080/tcp'],
      memLimit: '512MB',
      cpuLimit: '0.75 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  capstone:\n    image: hackrange/capstone-exam-node:v1\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Synthesize reconnaissance, privilege checking, and defense evaluation across an end-to-end simulated target.',
      setup: 'Full multi-tiered container environment combining network services, web portals, and system access.',
      steps: [
        '1. Conduct initial network discovery using Nmap.',
        '2. Identify running services and enumerate exposed web directories.',
        '3. Analyze application endpoints for input validation weaknesses.',
        '4. Audit system configurations against the Principle of Least Privilege.',
        '5. Complete all challenge verification tasks to unlock the room flag.'
      ],
      expectedOutcome: 'Complete systematic evaluation from external reconnaissance to system hardening verification.',
      bestPractices: 'Apply defense-in-depth across network, host, and application layers; enforce strict privilege separation.',
      cheatSheet: 'Full scan: nmap -sC -sV -p- 10.10.142.50'
    },
    flag: 'THM{CAPST0N3_SYLL4BUS_18_C0MPL3T3}',
    hint: 'Review both network services and web configurations to piece together the full assessment.',
    tasks: [
      { id: 't1_18', title: 'What principle dictates granting only the minimal permissions necessary for a service to function?', answer: 'Principle of Least Privilege', format: '********* ** ***** *********' },
      { id: 't2_18', title: 'Submit the capstone lab completion flag:', answer: 'THM{CAPST0N3_SYLL4BUS_18_C0MPL3T3}', format: 'THM{******************************}' }
    ]
  },
  {
    id: 19,
    title: 'Open SSH Server Deployment using Hydra',
    trackId: 'infra',
    difficulty: 'Medium',
    rewardXp: 140,
    hintCost: 30,
    docker: {
      image: 'hackrange/openssh-hardened:v2',
      containerName: 'hr-lab-19-sshd',
      ports: ['22/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  sshd-server:\n    image: hackrange/openssh-hardened:v2\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Deploy OpenSSH server on Linux, harden sshd_config (disable root logins, enforce ed25519 public key auth), and audit defense resilience against brute-force.',
      setup: 'OpenSSH server container testing password-based vs. key-based authentication with Fail2ban active.',
      steps: [
        '1. Audit default OpenSSH configuration: sshd -T | grep -E "permitrootlogin|passwordauthentication"',
        '2. Test brute-force resilience with Hydra: hydra -l user -P wordlist.txt 10.10.142.50 ssh',
        '3. Update /etc/ssh/sshd_config with: PermitRootLogin no and PasswordAuthentication no',
        '4. Generate elliptic curve keypair: ssh-keygen -t ed25519',
        '5. Re-run Hydra audit and observe password authentication immediately rejected.'
      ],
      expectedOutcome: 'Disabling password authentication completely eliminates dictionary brute-force attacks.',
      bestPractices: 'Disable root SSH logins; mandate ed25519 public-key authentication; restrict MaxAuthTries to 3; deploy Fail2ban.',
      cheatSheet: 'Generate key: ssh-keygen -t ed25519'
    },
    flag: 'THM{SSH_K3Y_B4S3D_4UTH_H4RD3N}',
    hint: 'Look for PermitRootLogin no and PasswordAuthentication no in /etc/ssh/sshd_config.',
    tasks: [
      { id: 't1_19', title: 'Which sshd_config directive prohibits the root superuser from logging in directly over SSH?', answer: 'PermitRootLogin no', format: '*************** **' },
      { id: 't2_19', title: 'What modern elliptic curve key algorithm is recommended with ssh-keygen -t?', answer: 'ed25519', format: '*******' },
      { id: 't3_19', title: 'Submit the SSH server hardening audit flag:', answer: 'THM{SSH_K3Y_B4S3D_4UTH_H4RD3N}', format: 'THM{****************************}' }
    ]
  },
  {
    id: 20,
    title: 'Network Analysis using Wireshark',
    trackId: 'recon',
    difficulty: 'Medium',
    rewardXp: 120,
    hintCost: 25,
    docker: {
      image: 'hackrange/wireshark-tap-node:latest',
      containerName: 'hr-lab-20-wireshark',
      ports: ['80/tcp', '21/tcp', '22/tcp'],
      memLimit: '384MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  traffic-gen:\n    image: hackrange/wireshark-tap-node:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Capture and dissect live network frames, isolate TCP conversations with display filters, and inspect cleartext credentials.',
      setup: 'Container running continuous background traffic with tcpdump/tshark packet inspection utilities.',
      steps: [
        '1. Capture frames on interface: tshark -i eth0 -w capture.pcap',
        '2. Filter HTTP POST requests: tshark -r capture.pcap -Y "http.request.method == \\"POST\\""',
        '3. Inspect TCP conversation stream for cleartext credentials.',
        '4. Extract credentials from unencrypted HTTP traffic.',
        '5. Verify that transitioning to HTTPS encrypts all payloads.'
      ],
      expectedOutcome: 'Cleartext protocols reveal passwords directly. Enforcing TLS hides all payload data behind encrypted frames.',
      bestPractices: 'Decommission legacy plaintext protocols; enforce TLS 1.3 across internal networks; segment traffic with VLANs.',
      cheatSheet: 'Filter HTTP POST: http.request.method == "POST"'
    },
    flag: 'THM{W1R3SH4RK_P4CK3T_D1SS3CT10N}',
    hint: 'Right-click an HTTP or TCP packet and choose "Follow -> TCP Stream" to reconstruct the dialogue.',
    tasks: [
      { id: 't1_20', title: 'What Wireshark display filter checks specifically for HTTP POST requests?', answer: 'http.request.method == "POST"', format: '******************* == "POST"' },
      { id: 't2_20', title: 'What feature in Wireshark reassembles a full two-way application dialogue from raw packets?', answer: 'Follow TCP Stream', format: '****** *** ******' },
      { id: 't3_20', title: 'Submit the token found inside the decoded HTTP POST payload:', answer: 'THM{W1R3SH4RK_P4CK3T_D1SS3CT10N}', format: 'THM{*****************************}' }
    ]
  },
  {
    id: 21,
    title: 'CSRF (Cross-Site Request Forgery)',
    trackId: 'web',
    difficulty: 'Medium',
    rewardXp: 130,
    hintCost: 25,
    docker: {
      image: 'hackrange/csrf-vulnerable-portal:latest',
      containerName: 'hr-lab-21-csrf',
      ports: ['80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.50 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  csrf-target:\n    image: hackrange/csrf-vulnerable-portal:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Construct a state-changing cross-site request exploit and validate anti-CSRF token protections paired with SameSite cookies.',
      setup: 'Web application with unvalidated profile update form vulnerable to cross-origin submissions.',
      steps: [
        '1. Inspect profile update form: curl -i http://10.10.142.50/profile/update',
        '2. Construct external PoC form that automatically submits to update endpoint.',
        '3. Observe browser submitting ambient session cookies, changing user data without consent.',
        '4. Implement cryptographically generated anti-CSRF tokens tied to user sessions.',
        '5. Set SameSite=Strict on all authentication cookies.'
      ],
      expectedOutcome: 'Without CSRF tokens, unauthorized actions execute using ambient browser credentials. With anti-CSRF tokens, forged requests are rejected.',
      bestPractices: 'Require unpredictable per-session anti-CSRF tokens; enforce SameSite=Strict or SameSite=Lax on cookies.',
      cheatSheet: 'Check cookie flag: Set-Cookie: SESSID=...; SameSite=Strict; Secure'
    },
    flag: 'THM{CR0SS_S1T3_R3QU3ST_F0RG3RY_D3F}',
    hint: 'Anti-CSRF tokens must be unpredictable, unique per user session, and validated on every state-changing request.',
    tasks: [
      { id: 't1_21', title: 'What unpredictable server-generated value validates that a request originated from the legitimate web app?', answer: 'CSRF Token', format: '**** *****' },
      { id: 't2_21', title: 'Which cookie attribute instructs browsers not to send the cookie along with cross-site requests?', answer: 'SameSite', format: '********' },
      { id: 't3_21', title: 'Submit the anti-CSRF validation flag:', answer: 'THM{CR0SS_S1T3_R3QU3ST_F0RG3RY_D3F}', format: 'THM{*********************************}' }
    ]
  },
  {
    id: 22,
    title: 'Banner Grabbing',
    trackId: 'recon',
    difficulty: 'Easy',
    rewardXp: 80,
    hintCost: 20,
    docker: {
      image: 'hackrange/banner-leak-node:latest',
      containerName: 'hr-lab-22-banner',
      ports: ['21/tcp', '22/tcp', '80/tcp'],
      memLimit: '128MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  banner-node:\n    image: hackrange/banner-leak-node:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Inspect initial service greeting messages across ports (HTTP, SSH, FTP) to determine software versions and assess known CVEs.',
      setup: 'Multi-service container configured with default verbose banners exposing OS and patch versions.',
      steps: [
        '1. Inspect HTTP response headers: curl -I http://10.10.142.50/',
        '2. Connect to SSH daemon to read greeting string: nc -vn 10.10.142.50 22',
        '3. Connect to FTP daemon: nc -vn 10.10.142.50 21',
        '4. Observe disclosure of exact version numbers in service headers.',
        '5. Harden services by setting ServerTokens Prod in Apache and server_tokens off in Nginx.'
      ],
      expectedOutcome: 'Verbose service greetings expose exact software versions. Hardening suppresses version details.',
      bestPractices: 'Set ServerTokens Prod and ServerSignature Off in Apache; set server_tokens off in Nginx.',
      cheatSheet: 'Grab HTTP banner: curl -I http://10.10.142.50'
    },
    flag: 'THM{BANN3R_SSH_L34K_AUD1T}',
    hint: 'Set ServerTokens Prod and ServerSignature Off in Apache security.conf to hide version numbers.',
    tasks: [
      { id: 't1_22', title: 'What is the default TCP port used by the SSH daemon?', answer: '22', format: '**' },
      { id: 't2_22', title: 'Which Apache directive restricts the "Server" HTTP response header to just "Apache"?', answer: 'ServerTokens Prod', format: '************ ****' },
      { id: 't3_22', title: 'Submit the verification flag reported in the SSH service banner:', answer: 'THM{BANN3R_SSH_L34K_AUD1T}', format: 'THM{**********************}' }
    ]
  },
  {
    id: 23,
    title: 'Sub Domain Finding',
    trackId: 'recon',
    difficulty: 'Easy',
    rewardXp: 100,
    hintCost: 20,
    docker: {
      image: 'hackrange/dns-bind9-mock:latest',
      containerName: 'hr-lab-23-dnszone',
      ports: ['53/udp', '53/tcp', '80/tcp'],
      memLimit: '256MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  bind-dns:\n    image: hackrange/dns-bind9-mock:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Enumerate subdomain assets using passive Certificate Transparency queries, active DNS brute-forcing, and AXFR zone transfer checks.',
      setup: 'BIND9 DNS container with misconfigured zone transfer (AXFR) and mock Certificate Transparency endpoints.',
      steps: [
        '1. Test for misconfigured DNS Zone Transfer: dig axfr @10.10.142.50 target.lab',
        '2. Observe full DNS zone record disclosure including internal staging and API hosts.',
        '3. Query Certificate Transparency log endpoint: curl -s "http://10.10.142.50/crtsh?domain=target.lab"',
        '4. Extract discovered subdomains: staging.target.lab, api.target.lab.',
        '5. Restrict DNS zone transfers to authorized secondary name server IPs in named.conf.'
      ],
      expectedOutcome: 'Misconfigured DNS servers leak all subdomains via AXFR. Hardening named.conf restricts zone transfers.',
      bestPractices: 'Restrict DNS zone transfers (allow-transfer { none; }); monitor public Certificate Transparency logs.',
      cheatSheet: 'Check AXFR: dig axfr @10.10.142.50 target.lab'
    },
    flag: 'THM{SUBD0M41N_DNS_3NUM_C0MPL3T3}',
    hint: 'Certificate Transparency logs publicly record all SSL/TLS certificates issued by public Certificate Authorities.',
    tasks: [
      { id: 't1_23', title: 'What DNS query record type tests for an unrestricted full zone transfer?', answer: 'AXFR', format: '****' },
      { id: 't2_23', title: 'What public cryptographic log system records all SSL/TLS certificates issued by public CAs?', answer: 'Certificate Transparency', format: '*********** ************' },
      { id: 't3_23', title: 'Submit the subdomain discovery flag found on the staging endpoint:', answer: 'THM{SUBD0M41N_DNS_3NUM_C0MPL3T3}', format: 'THM{*****************************}' }
    ]
  },
  {
    id: 24,
    title: 'Google Dorking',
    trackId: 'recon',
    difficulty: 'Easy',
    rewardXp: 90,
    hintCost: 20,
    docker: {
      image: 'hackrange/osint-search-mock:latest',
      containerName: 'hr-lab-24-dorking',
      ports: ['80/tcp'],
      memLimit: '128MB',
      cpuLimit: '0.25 vCPU',
      network: 'hackrange-isolated-bridge',
      composeFile: `version: '3.8'\nservices:\n  mock-dorking:\n    image: hackrange/osint-search-mock:latest\n    networks:\n      isolated_net:\n        ipv4_address: 10.10.142.50\nnetworks:\n  isolated_net:\n    internal: true`
    },
    manual: {
      objective: 'Use advanced search engine operators (filetype:, site:, intitle:, inurl:) to discover exposed configuration files and directories.',
      setup: 'Mock index search portal simulating indexed targets with exposed configuration files.',
      steps: [
        '1. Query search portal using filetype operator: filetype:env site:target.lab',
        '2. Identify exposed environment files containing plain database credentials.',
        '3. Search for open directory listings: intitle:"index of" site:target.lab',
        '4. Search for administrative interfaces: inurl:admin site:target.lab',
        '5. Configure robots.txt and X-Robots-Tag headers to disallow indexing.'
      ],
      expectedOutcome: 'Search operators uncover sensitive configuration files. Applying proper web controls stops search crawlers.',
      bestPractices: 'Place sensitive configuration files outside public document roots; configure robots.txt and X-Robots-Tag: noindex.',
      cheatSheet: 'Find env files: filetype:env "DB_PASSWORD"'
    },
    flag: 'THM{G00GL3_D0RK1NG_0S1NT_SK1LLS}',
    hint: 'Use filetype:env or filetype:sql combined with site: to search for exposed configuration backups.',
    tasks: [
      { id: 't1_24', title: 'Which Google search operator restricts search results to a specific file extension (like sql or env)?', answer: 'filetype:', format: '*********' },
      { id: 't2_24', title: 'Which operator filters results to pages containing specific keywords within the URL string?', answer: 'inurl:', format: '******' },
      { id: 't3_24', title: 'Submit the passive intelligence flag discovered in the indexed file:', answer: 'THM{G00GL3_D0RK1NG_0S1NT_SK1LLS}', format: 'THM{*****************************}' }
    ]
  }
];

const INDIVIDUAL_PRACTICE_VMS = {
  kali: {
    id: 'kali',
    name: 'Kali Linux 2026.1 (AttackBox)',
    type: 'Attacker Workstation',
    ip: '10.10.142.10',
    os: 'Kali GNU/Linux Rolling (Kernel 6.8.0-kali)',
    specs: '2 vCPU | 2048 MB RAM | 40 GB NVMe',
    statusBadge: 'Attacker Operating System',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgBadge: 'bg-emerald-950/30',
    defaultShell: 'kali@hackrange:~$',
    installedTools: ['nmap', 'sqlmap', 'hydra', 'tshark', 'gobuster', 'curl', 'nikto', 'netcat', 'msfconsole'],
    description: 'Offensive and defensive security operations workstation equipped with industry reconnaissance, audit, and penetration testing tools connected to the isolated network bridge.'
  },
  dvwa: {
    id: 'dvwa',
    name: 'DVWA Target Node (PHP/MySQL Web Sandbox)',
    type: 'Vulnerable Web Application',
    ip: '10.10.142.80',
    os: 'Debian 12 Bookworm + Apache 2.4.59 + MariaDB 10.11',
    specs: '1 vCPU | 512 MB RAM | 10 GB Disk',
    statusBadge: 'Web Security Sandbox',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgBadge: 'bg-cyan-950/30',
    defaultShell: 'www-data@dvwa-server:/var/www/html$',
    installedTools: ['apache2', 'php8.2-fpm', 'mariadb-server', 'pdo_mysql', 'mod_php'],
    description: 'Damn Vulnerable Web Application. Packed with togglable OWASP Top 10 vulnerabilities (SQLi, Command Injection, Reflected & Stored XSS, CSRF, LFI) across Low, Medium, High, and Impossible security levels.'
  },
  metasploitable: {
    id: 'metasploitable',
    name: 'Metasploitable 2 Target Node (Daemon Server)',
    type: 'Vulnerable Network Server',
    ip: '10.10.142.81',
    os: 'Ubuntu 8.04 LTS (Kernel 2.6.24-16-server) Target',
    specs: '1 vCPU | 1024 MB RAM | 15 GB Disk',
    statusBadge: 'Network Services Target',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgBadge: 'bg-amber-950/30',
    defaultShell: 'msfadmin@metasploitable:~#',
    installedTools: ['vsftpd 2.3.4', 'OpenSSH 4.7p1', 'Samba 3.0.20', 'distcc', 'Bind9', 'MySQL 5.0'],
    description: 'Intentionally vulnerable Unix system running standard legacy network daemons with known CVE implementations. Ideal for port reconnaissance, banner analysis, and credential auditing.'
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState('practice-vms'); // 'practice-vms' | 'room' | 'catalog'
  const [activeLabId, setActiveLabId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('all');
  const [activePaneTab, setActivePaneTab] = useState('terminal'); // 'terminal' | 'manual' | 'docker'

  // Selected individual machine in the Practice VMs view
  const [selectedVmId, setSelectedVmId] = useState('kali');

  // Independent power and state for the three separate virtual machines
  const [vmStates, setVmStates] = useState({
    kali: { status: 'running', uptime: 512, ip: '10.10.142.10', cpu: '2.1%', mem: '412MB / 2048MB' },
    dvwa: { status: 'running', uptime: 384, ip: '10.10.142.80', cpu: '0.8%', mem: '184MB / 512MB' },
    metasploitable: { status: 'running', uptime: 290, ip: '10.10.142.81', cpu: '1.4%', mem: '298MB / 1024MB' }
  });

  // Independent terminal shell logs for each individual machine
  const [kaliTerminalLogs, setKaliTerminalLogs] = useState([
    { type: 'sys', text: 'Kali Linux 2026.1 (Release: Rolling) [eth0: 10.10.142.10/24]' },
    { type: 'info', text: 'Attacker workstation online. Available targets:\n  • 10.10.142.80 (DVWA Web Application)\n  • 10.10.142.81 (Metasploitable 2 Daemons)\nType "help" for network utilities or "nmap 10.10.142.80" to probe.' }
  ]);
  const [kaliInput, setKaliInput] = useState('');

  const [dvwaTerminalLogs, setDvwaTerminalLogs] = useState([
    { type: 'sys', text: 'Linux dvwa-sandbox 6.1.0-18-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1' },
    { type: 'info', text: 'Apache 2.4.59 and MariaDB 10.11 running. Web server document root: /var/www/html' },
    { type: 'info', text: 'Type "help", "tail /var/log/apache2/access.log", "cat config/config.inc.php", or "ls -la".' }
  ]);
  const [dvwaInput, setDvwaInput] = useState('');

  const [metaTerminalLogs, setMetaTerminalLogs] = useState([
    { type: 'sys', text: 'Linux metasploitable 2.6.24-16-server #1 SMP Thu Apr 10 13:58:00 UTC 2008 i686' },
    { type: 'info', text: 'Welcome to Metasploitable 2 vulnerable daemon sandbox.\nRunning services: vsftpd 2.3.4 (21), OpenSSH 4.7p1 (22), Telnet (23), Apache (80), Samba (139/445), MySQL (3306)' },
    { type: 'info', text: 'Type "help", "netstat -tulpn", "service --status-all", or "cat /etc/shadow".' }
  ]);
  const [metaInput, setMetaInput] = useState('');

  // Interactive DVWA In-Browser GUI Simulator State
  const [dvwaGuiState, setDvwaGuiState] = useState({
    activeModule: 'sqli', // 'sqli' | 'exec' | 'xss_r' | 'fi'
    securityLevel: 'low',
    isLoggedIn: true,
    sqliInput: '1',
    sqliOutput: null,
    execInput: '127.0.0.1',
    execOutput: null,
    xssInput: '<script>alert("XSS")</script>',
    xssOutput: null,
    fiInput: 'include.php',
    fiOutput: null
  });

  // Syllabus Lab State
  const activeLab = useMemo(() => {
    return SEED_LABS.find(l => l.id === activeLabId) || SEED_LABS[0];
  }, [activeLabId]);

  const [user, setUser] = useState({
    username: 'operator_01',
    rank: 'Cyber Specialist',
    xp: 940,
    streak: 7,
    completedLabIds: [],
    completedTaskIds: []
  });

  const [taskInputs, setTaskInputs] = useState({});
  const [taskStatus, setTaskStatus] = useState({});
  const [copiedIp, setCopiedIp] = useState(false);
  const [notification, setNotification] = useState(null);
  const [revealedHints, setRevealedHints] = useState({});

  // Active Lab Room Container State
  const [machineState, setMachineState] = useState({
    status: 'running',
    ip: '10.10.142.50',
    timeRemaining: 3600,
    isStarting: false,
    containerId: 'd4f91c7a80b2',
    uptime: 142
  });
  const [roomTerminalLogs, setRoomTerminalLogs] = useState([
    { type: 'sys', text: 'HackRange Isolated Docker Daemon [bridge: hackrange-isolated-bridge] connected.' },
    { type: 'docker', text: `Target container hr-lab-01-slowhttp:running [IP: 10.10.142.50 | 256MB | No-Egress]` }
  ]);
  const [roomTerminalInput, setRoomTerminalInput] = useState('');

  const kaliEndRef = useRef(null);
  const dvwaEndRef = useRef(null);
  const metaEndRef = useRef(null);
  const roomEndRef = useRef(null);

  useEffect(() => {
    kaliEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [kaliTerminalLogs]);

  useEffect(() => {
    dvwaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dvwaTerminalLogs]);

  useEffect(() => {
    metaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [metaTerminalLogs]);

  useEffect(() => {
    roomEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomTerminalLogs]);

  // Uptime tick for running VMs
  useEffect(() => {
    const timer = setInterval(() => {
      setVmStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k].status === 'running') {
            next[k].uptime = next[k].uptime + 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const copyToClipboard = (text) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
      showToast('info', `Copied '${text}' to clipboard.`);
    } catch {
      showToast('error', 'Failed to copy to clipboard.');
    }
  };

  const toggleVmPower = (vmId) => {
    const current = vmStates[vmId];
    if (current.status === 'running') {
      setVmStates(prev => ({
        ...prev,
        [vmId]: { ...prev[vmId], status: 'stopped', uptime: 0 }
      }));
      showToast('info', `${INDIVIDUAL_PRACTICE_VMS[vmId].name} powered off.`);
    } else {
      setVmStates(prev => ({
        ...prev,
        [vmId]: { ...prev[vmId], status: 'running', uptime: 1 }
      }));
      showToast('success', `${INDIVIDUAL_PRACTICE_VMS[vmId].name} booted online at ${INDIVIDUAL_PRACTICE_VMS[vmId].ip}.`);
    }
  };

  const restartVm = (vmId) => {
    showToast('info', `Rebooting ${INDIVIDUAL_PRACTICE_VMS[vmId].name}...`);
    setVmStates(prev => ({
      ...prev,
      [vmId]: { ...prev[vmId], status: 'rebooting' }
    }));
    setTimeout(() => {
      setVmStates(prev => ({
        ...prev,
        [vmId]: { ...prev[vmId], status: 'running', uptime: 1 }
      }));
      showToast('success', `${INDIVIDUAL_PRACTICE_VMS[vmId].name} reboot completed.`);
    }, 900);
  };

  const handleKaliCommand = (e) => {
    e.preventDefault();
    const raw = kaliInput.trim();
    if (!raw) return;
    setKaliInput('');

    setKaliTerminalLogs(prev => [...prev, { type: 'cmd', text: `kali@hackrange:~$ ${raw}` }]);

    if (vmStates.kali.status !== 'running') {
      setKaliTerminalLogs(prev => [...prev, { type: 'error', text: 'kali-linux: system is powered off. Power on machine to use console.' }]);
      return;
    }

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const target = parts[1] || '';

    if (cmd === 'clear') {
      setKaliTerminalLogs([]);
      return;
    }

    if (cmd === 'help') {
      setKaliTerminalLogs(prev => [
        ...prev,
        {
          type: 'info',
          text: 'Kali Linux Workstation Utilities:\n' +
                '  nmap <ip>                 - Run comprehensive TCP port scan against target\n' +
                '  curl -I <url>             - Probe HTTP response headers and web service banners\n' +
                '  ping <ip>                 - Test ICMP round-trip latency across the bridge\n' +
                '  sqlmap -u <url>           - Automated SQL injection probe\n' +
                '  hydra -l <ufs> -P <pass>  - Dictionary password attack simulator\n' +
                '  nikto -h <ip>             - Web server vulnerability inspection\n' +
                '  tshark -i eth0            - Live packet dissection summary\n' +
                '  ifconfig / ip addr        - View local network interface configuration\n' +
                '  clear                     - Reset terminal output buffer'
        }
      ]);
      return;
    }

    if (cmd === 'ifconfig' || (cmd === 'ip' && parts[1] === 'addr')) {
      setKaliTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n` +
                `        inet 10.10.142.10  netmask 255.255.255.0  broadcast 10.10.142.255\n` +
                `        inet6 fe80::42:aff:fe0a:8e0a  prefixlen 64  scopeid 0x20<link>\n` +
                `        ether 02:42:0a:0a:8e:0a  txqueuelen 0  (Ethernet)\n` +
                `        RX packets 4210  bytes 381940 (372.9 KiB)\n` +
                `        TX packets 3918  bytes 291040 (284.2 KiB)\n\n` +
                `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n` +
                `        inet 127.0.0.1  netmask 255.0.0.0`
        }
      ]);
      return;
    }

    if (cmd === 'ping') {
      const pingTarget = target || '10.10.142.80';
      const isDvwa = pingTarget.includes('80');
      const isMeta = pingTarget.includes('81');
      const targetRunning = isDvwa ? vmStates.dvwa.status === 'running' : isMeta ? vmStates.metasploitable.status === 'running' : true;

      if (!targetRunning) {
        setKaliTerminalLogs(prev => [
          ...prev,
          { type: 'error', text: `PING ${pingTarget} (10.10.142.x) 56(84) bytes of data.\nFrom 10.10.142.10 icmp_seq=1 Destination Host Unreachable` }
        ]);
        return;
      }

      setKaliTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `PING ${pingTarget} (${pingTarget}) 56(84) bytes of data.\n` +
                `64 bytes from ${pingTarget}: icmp_seq=1 ttl=64 time=0.384 ms\n` +
                `64 bytes from ${pingTarget}: icmp_seq=2 ttl=64 time=0.412 ms\n` +
                `64 bytes from ${pingTarget}: icmp_seq=3 ttl=64 time=0.395 ms\n` +
                `--- ${pingTarget} ping statistics --- 3 packets transmitted, 3 received, 0% packet loss`
        }
      ]);
      return;
    }

    if (cmd === 'nmap') {
      if (target.includes('80') || target.toLowerCase().includes('dvwa')) {
        if (vmStates.dvwa.status !== 'running') {
          setKaliTerminalLogs(prev => [...prev, { type: 'error', text: 'Note: Host 10.10.142.80 seems down. Power on the DVWA machine to scan.' }]);
          return;
        }
        setKaliTerminalLogs(prev => [
          ...prev,
          {
            type: 'output',
            text: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-17 01:00 UTC\n` +
                  `Nmap scan report for dvwa.target (10.10.142.80)\n` +
                  `Host is up (0.00041s latency).\n` +
                  `PORT     STATE SERVICE VERSION\n` +
                  `80/tcp   open  http    Apache httpd 2.4.59 ((Debian) PHP/8.2.18)\n` +
                  `|_http-title: Damn Vulnerable Web Application (DVWA) - Login\n` +
                  `|_http-server-header: Apache/2.4.59 (Debian)\n` +
                  `3306/tcp open  mysql   MariaDB 10.11.6\n` +
                  `Service Info: OS: Linux; CPE: cpe:/o:debian:debian_linux`
          }
        ]);
        return;
      }

      if (target.includes('81') || target.toLowerCase().includes('meta')) {
        if (vmStates.metasploitable.status !== 'running') {
          setKaliTerminalLogs(prev => [...prev, { type: 'error', text: 'Note: Host 10.10.142.81 seems down. Power on Metasploitable 2 to scan.' }]);
          return;
        }
        setKaliTerminalLogs(prev => [
          ...prev,
          {
            type: 'output',
            text: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-17 01:00 UTC\n` +
                  `Nmap scan report for metasploitable.target (10.10.142.81)\n` +
                  `Host is up (0.00038s latency).\n` +
                  `PORT     STATE SERVICE     VERSION\n` +
                  `21/tcp   open  ftp         vsftpd 2.3.4 (Backdoor CVE-2011-2523 vulnerable)\n` +
                  `22/tcp   open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1\n` +
                  `23/tcp   open  telnet      Linux telnetd\n` +
                  `25/tcp   open  smtp        Postfix smtpd\n` +
                  `80/tcp   open  http        Apache httpd 2.2.8 ((Ubuntu) DAV/2)\n` +
                  `139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X\n` +
                  `445/tcp  open  netbios-ssn Samba smbd 3.0.20-Debian\n` +
                  `3306/tcp open  mysql       MySQL 5.0.51a-3ubuntu5\n` +
                  `5432/tcp open  postgresql  PostgreSQL DB 8.3.0`
          }
        ]);
        return;
      }

      // Default generic scan
      setKaliTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-17 01:00 UTC\n` +
                `Nmap scan report for ${target || '10.10.142.0/24'}\n` +
                `10.10.142.10 (Kali Workstation) [Local]\n` +
                `10.10.142.80 (DVWA Web Target) - Port 80, 3306 Open\n` +
                `10.10.142.81 (Metasploitable Daemon Node) - Ports 21, 22, 23, 25, 80, 139, 445 Open`
        }
      ]);
      return;
    }

    if (cmd === 'curl') {
      const url = target || 'http://10.10.142.80/';
      setKaliTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `HTTP/1.1 200 OK\n` +
                `Date: Sat, 17 Oct 2026 01:00:00 GMT\n` +
                `Server: Apache/2.4.59 (Debian)\n` +
                `X-Powered-By: PHP/8.2.18\n` +
                `Set-Cookie: PHPSESSID=dvwa_sess_${Math.random().toString(36).substring(7)}; path=/\n` +
                `Set-Cookie: security=low; path=/\n` +
                `Content-Type: text/html; charset=UTF-8\n` +
                `Content-Length: 4892\n\n` +
                `<!DOCTYPE html><html><head><title>Damn Vulnerable Web Application (DVWA)</title></head>...`
        }
      ]);
      return;
    }

    if (cmd === 'nikto') {
      setKaliTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `- Nikto v2.5.0\n` +
                `+ Target IP: 10.10.142.80\n` +
                `+ Target Port: 80\n` +
                `+ Server: Apache/2.4.59 (Debian)\n` +
                `+ /login.php: Admin login form identified with default credentials allowed.\n` +
                `+ /vulnerabilities/fi/?page=include.php: Local File Inclusion candidate detected.\n` +
                `+ /vulnerabilities/sqli/?id=1: Parameter 'id' vulnerable to SQL Injection.\n` +
                `+ 7384 requests completed in 3.42 seconds.`
        }
      ]);
      return;
    }

    setKaliTerminalLogs(prev => [
      ...prev,
      { type: 'error', text: `bash: ${cmd}: command executed on Kali. For full options try 'nmap 10.10.142.80' or 'help'.` }
    ]);
  };

  const handleDvwaCommand = (e) => {
    e.preventDefault();
    const raw = dvwaInput.trim();
    if (!raw) return;
    setDvwaInput('');

    setDvwaTerminalLogs(prev => [...prev, { type: 'cmd', text: `www-data@dvwa-server:/var/www/html$ ${raw}` }]);

    if (vmStates.dvwa.status !== 'running') {
      setDvwaTerminalLogs(prev => [...prev, { type: 'error', text: 'dvwa-node: container is offline.' }]);
      return;
    }

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'clear') {
      setDvwaTerminalLogs([]);
      return;
    }

    if (cmd === 'help') {
      setDvwaTerminalLogs(prev => [
        ...prev,
        {
          type: 'info',
          text: 'DVWA Server Debug Commands:\n' +
                '  ls -la                    - List files in webroot (/var/www/html)\n' +
                '  cat config/config.inc.php - View DVWA DB config and credentials\n' +
                '  cat /etc/passwd           - Read system passwd file\n' +
                '  tail -n 20 /var/log/apache2/access.log - View recent web queries\n' +
                '  mysql -u dvwa -p          - Test database connectivity\n' +
                '  whoami / id               - View web daemon privileges'
        }
      ]);
      return;
    }

    if (cmd === 'whoami' || cmd === 'id') {
      setDvwaTerminalLogs(prev => [
        ...prev,
        { type: 'output', text: 'uid=33(www-data) gid=33(www-data) groups=33(www-data)' }
      ]);
      return;
    }

    if (cmd === 'ls') {
      setDvwaTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `total 68\n` +
                `drwxr-xr-x 8 www-data www-data  4096 Oct 17 00:00 .\n` +
                `drwxr-xr-x 3 root     root      4096 Oct 16 23:50 ..\n` +
                `drwxr-xr-x 2 www-data www-data  4096 Oct 17 00:01 config\n` +
                `-rw-r--r-- 1 www-data www-data  2384 Oct 16 23:55 index.php\n` +
                `-rw-r--r-- 1 www-data www-data  1820 Oct 16 23:55 login.php\n` +
                `-rw-r--r-- 1 www-data www-data   412 Oct 16 23:55 robots.txt\n` +
                `drwxr-xr-x 8 www-data www-data  4096 Oct 16 23:55 vulnerabilities`
        }
      ]);
      return;
    }

    if (cmd === 'cat') {
      const file = parts[1] || '';
      if (file.includes('config')) {
        setDvwaTerminalLogs(prev => [
          ...prev,
          {
            type: 'output',
            text: `<?php\n` +
                  `$_DVWA = array();\n` +
                  `$_DVWA[ 'db_server' ]   = '127.0.0.1';\n` +
                  `$_DVWA[ 'db_database' ] = 'dvwa';\n` +
                  `$_DVWA[ 'db_user' ]     = 'app_user';\n` +
                  `$_DVWA[ 'db_password' ] = 'vulnerable_db_pass_2026';\n` +
                  `$_DVWA[ 'default_security_level' ] = 'low';\n` +
                  `?>`
          }
        ]);
        return;
      }

      if (file.includes('passwd')) {
        setDvwaTerminalLogs(prev => [
          ...prev,
          {
            type: 'output',
            text: `root:x:0:0:root:/root:/bin/bash\n` +
                  `daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n` +
                  `www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n` +
                  `mysql:x:107:114:MySQL Server,,,:/nonexistent:/bin/false\n` +
                  `dvwa_admin:x:1001:1001:DVWA Administrator,,,:/home/dvwa_admin:/bin/bash`
          }
        ]);
        return;
      }
    }

    setDvwaTerminalLogs(prev => [
      ...prev,
      { type: 'output', text: `Command completed: ${raw}` }
    ]);
  };

  const handleMetaCommand = (e) => {
    e.preventDefault();
    const raw = metaInput.trim();
    if (!raw) return;
    setMetaInput('');

    setMetaTerminalLogs(prev => [...prev, { type: 'cmd', text: `msfadmin@metasploitable:~# ${raw}` }]);

    if (vmStates.metasploitable.status !== 'running') {
      setMetaTerminalLogs(prev => [...prev, { type: 'error', text: 'metasploitable-node: system is offline.' }]);
      return;
    }

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'clear') {
      setMetaTerminalLogs([]);
      return;
    }

    if (cmd === 'help') {
      setMetaTerminalLogs(prev => [
        ...prev,
        {
          type: 'info',
          text: 'Metasploitable 2 Administration Commands:\n' +
                '  netstat -tulpn            - List all listening TCP/UDP daemon ports\n' +
                '  cat /etc/issue            - Show OS banner\n' +
                '  service --status-all      - Enumerate running service daemons\n' +
                '  cat /etc/shadow           - Inspect password hashes (root privilege)\n' +
                '  ps aux                    - Review active background processes\n' +
                '  uname -a                  - View kernel architecture'
        }
      ]);
      return;
    }

    if (cmd === 'netstat') {
      setMetaTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `Active Internet connections (only servers)\n` +
                `Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name\n` +
                `tcp        0      0 0.0.0.0:21              0.0.0.0:*               LISTEN      4210/vsftpd\n` +
                `tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      4218/sshd\n` +
                `tcp        0      0 0.0.0.0:23              0.0.0.0:*               LISTEN      4230/inetd\n` +
                `tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      4288/apache2\n` +
                `tcp        0      0 0.0.0.0:139             0.0.0.0:*               LISTEN      4312/smbd\n` +
                `tcp        0      0 0.0.0.0:445             0.0.0.0:*               LISTEN      4312/smbd\n` +
                `tcp        0      0 0.0.0.0:3306            0.0.0.0:*               LISTEN      4350/mysqld`
        }
      ]);
      return;
    }

    if (cmd === 'uname' || (cmd === 'cat' && parts[1]?.includes('issue'))) {
      setMetaTerminalLogs(prev => [
        ...prev,
        { type: 'output', text: 'Linux metasploitable 2.6.24-16-server #1 SMP i686 GNU/Linux\nUbuntu 8.04 - Metasploitable 2 Hardening Sandbox' }
      ]);
      return;
    }

    if (cmd === 'cat' && parts[1]?.includes('shadow')) {
      setMetaTerminalLogs(prev => [
        ...prev,
        {
          type: 'output',
          text: `root:$1$p7.pL/$z49kI...:14000:0:99999:7:::\n` +
                `daemon:*:14000:0:99999:7:::\n` +
                `msfadmin:$1$MyVlQ$87oKqW4iU0x1...:14000:0:99999:7:::\n` +
                `service:$1$service$gH59j8...:14000:0:99999:7:::\n` +
                `user:$1$user$8xK0lP...:14000:0:99999:7:::`
        }
      ]);
      return;
    }

    setMetaTerminalLogs(prev => [
      ...prev,
      { type: 'output', text: `msfadmin executed: ${raw}` }
    ]);
  };

  const runDvwaWebTest = () => {
    const mod = dvwaGuiState.activeModule;
    const sec = dvwaGuiState.securityLevel;

    if (mod === 'sqli') {
      const q = dvwaGuiState.sqliInput.trim();
      if (sec === 'low' && (q.includes("' OR") || q.includes("' or") || q.includes("1=1") || q.includes("UNION") || q.includes("union"))) {
        setDvwaGuiState(prev => ({
          ...prev,
          sqliOutput: [
            { id: 1, first: 'admin', surname: 'admin (hash: 5f4dcc3b5aa765d61d8327deb882cf99)' },
            { id: 2, first: 'Gordon', surname: 'Brown (hash: e99a18c428cb38d5f260853678922e03)' },
            { id: 3, first: 'Hack', surname: 'Me (hash: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92)' },
            { id: 4, first: 'Pablo', surname: 'Picasso (hash: 0d107d09f5bbe40ade3de5da940e219c)' },
            { id: 5, first: 'Bob', surname: 'Smith (hash: a0f4236e3e5714e8b3b48232fc12a4df)' }
          ]
        }));
      } else if (q === '1') {
        setDvwaGuiState(prev => ({
          ...prev,
          sqliOutput: [{ id: 1, first: 'admin', surname: 'admin' }]
        }));
      } else {
        setDvwaGuiState(prev => ({
          ...prev,
          sqliOutput: [{ id: 'Error', first: 'Query returned 0 rows or parameter escaped safely.', surname: '-' }]
        }));
      }
    }

    if (mod === 'exec') {
      const ip = dvwaGuiState.execInput.trim();
      if (sec === 'low' && (ip.includes(';') || ip.includes('&') || ip.includes('|'))) {
        setDvwaGuiState(prev => ({
          ...prev,
          execOutput: `PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.038 ms\n\nuid=33(www-data) gid=33(www-data) groups=33(www-data)\nLinux dvwa-sandbox 6.1.0-18-amd64 Debian`
        }));
      } else {
        setDvwaGuiState(prev => ({
          ...prev,
          execOutput: `PING ${ip} (${ip}) 56(84) bytes of data.\n64 bytes from ${ip}: icmp_seq=1 ttl=64 time=0.041 ms\n64 bytes from ${ip}: icmp_seq=2 ttl=64 time=0.039 ms\n--- ${ip} ping statistics --- 2 packets transmitted, 2 received, 0% packet loss`
        }));
      }
    }

    if (mod === 'xss_r') {
      setDvwaGuiState(prev => ({
        ...prev,
        xssOutput: dvwaGuiState.xssInput
      }));
    }

    if (mod === 'fi') {
      const page = dvwaGuiState.fiInput.trim();
      if (page.includes('../etc/passwd')) {
        setDvwaGuiState(prev => ({
          ...prev,
          fiOutput: `root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\ndvwa_user:x:1000:1000:,,,:/home/dvwa_user:/bin/bash`
        }));
      } else {
        setDvwaGuiState(prev => ({
          ...prev,
          fiOutput: `Hello from ${page}! Content loaded successfully from web document directory.`
        }));
      }
    }
  };

  const handleCheckAnswer = (task) => {
    const entered = (taskInputs[task.id] || '').trim();
    if (!entered) {
      showToast('warning', 'Please enter an answer before submitting.');
      return;
    }

    const isMatch = entered.toLowerCase() === task.answer.toLowerCase();

    if (isMatch) {
      const isFirstSolve = !user.completedTaskIds.includes(task.id);
      if (isFirstSolve) {
        setUser(prev => ({
          ...prev,
          xp: prev.xp + 40,
          completedTaskIds: [...prev.completedTaskIds, task.id]
        }));
        showToast('success', 'Correct Answer! +40 XP awarded.');
      } else {
        showToast('info', 'Correct! (Already completed).');
      }

      setTaskStatus(prev => ({ ...prev, [task.id]: 'correct' }));

      const allDone = activeLab.tasks.every(t => t.id === task.id || user.completedTaskIds.includes(t.id));
      if (allDone && !user.completedLabIds.includes(activeLab.id)) {
        setUser(prev => ({ ...prev, completedLabIds: [...prev.completedLabIds, activeLab.id] }));
        showToast('success', `Room Completed: Congratulations on finishing Lab #${activeLab.id}!`);
      }
    } else {
      setTaskStatus(prev => ({ ...prev, [task.id]: 'incorrect' }));
      showToast('error', 'Incorrect answer. Check manual instructions or reveal hint.');
    }
  };

  const getDifficultyPill = (diff) => {
    if (diff === 'Easy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (diff === 'Medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  const filteredLabs = useMemo(() => {
    return SEED_LABS.filter(lab => {
      const matchesTrack = selectedTrackFilter === 'all' || lab.trackId === selectedTrackFilter;
      const matchesSearch = lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lab.manual.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            String(lab.id).includes(searchQuery);
      return matchesTrack && matchesSearch;
    });
  }, [selectedTrackFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#090c10] text-slate-200 font-sans flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Toast Alert */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg border text-xs font-mono shadow-2xl flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-[#18231d] text-emerald-400 border-emerald-600/50' :
          notification.type === 'error' ? 'bg-[#291717] text-rose-400 border-rose-600/50' :
          notification.type === 'warning' ? 'bg-[#292217] text-amber-400 border-amber-600/50' :
          'bg-[#192231] text-cyan-400 border-cyan-600/50'
        }`}>
          {notification.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          {notification.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
          {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {notification.type === 'info' && <Radio className="w-4 h-4 text-cyan-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Primary Top Header */}
      <header className="bg-[#12161f] border-b border-slate-800 px-4 lg:px-6 py-2.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 shadow-md shadow-emerald-500/20">
                <Boxes className="w-5 h-5 text-slate-950" />
              </div>
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
                <span>HACK<span className="text-emerald-400">RANGE</span></span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2433] text-cyan-400 border border-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> 3-NODE LABS
                </span>
              </div>
            </div>

            <nav className="flex items-center gap-1 text-xs font-medium text-slate-300">
              <button 
                onClick={() => setCurrentView('practice-vms')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${currentView === 'practice-vms' ? 'bg-[#1f2636] text-emerald-400 font-bold border border-emerald-500/30' : 'hover:text-white'}`}
              >
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>3 Independent VMs (Kali / DVWA / Metasploitable)</span>
              </button>
              <button 
                onClick={() => setCurrentView('room')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${currentView === 'room' ? 'bg-[#1f2636] text-white font-semibold' : 'hover:text-white'}`}
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Syllabus Lab Room</span>
              </button>
              <button 
                onClick={() => setCurrentView('catalog')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${currentView === 'catalog' ? 'bg-[#1f2636] text-white font-semibold' : 'hover:text-white'}`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>24 Practical Labs Directory</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#0a0d14] border border-slate-800 rounded-md">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">{user.xp}</span>
              <span className="text-slate-500 text-[11px]">XP</span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden lg:block text-slate-300 text-xs font-medium">{user.username}</span>
            </div>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto w-full p-4 lg:p-6 flex-1 flex flex-col gap-6">

        {/* =========================================================================
            VIEW 1: THREE SEPARATE REAL MACHINES (Kali, DVWA, Metasploitable)
        ========================================================================= */}
        {currentView === 'practice-vms' && (
          <div className="space-y-6">
            
            {/* Top Subnet Summary Bar */}
            <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0a0d14] border border-slate-700 flex items-center justify-center text-emerald-400">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Three-Node Virtual Cyber Range</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      Subnet: 10.10.142.0/24
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Each machine runs independently with its own OS, IP, services, and interactive shell console.
                  </p>
                </div>
              </div>

              {/* Machine Quick Switcher Buttons */}
              <div className="flex items-center gap-2">
                {Object.keys(INDIVIDUAL_PRACTICE_VMS).map(key => {
                  const vm = INDIVIDUAL_PRACTICE_VMS[key];
                  const state = vmStates[key];
                  const isSelected = selectedVmId === key;
                  const isRunning = state.status === 'running';

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedVmId(key)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 border ${
                        isSelected 
                          ? `${vm.borderColor} ${vm.bgBadge} text-white shadow-lg` 
                          : 'bg-[#0e1219] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span>{key.toUpperCase()}</span>
                      <span className="text-[11px] text-slate-500 font-normal">({vm.ip})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Machine Header Card & Power Controls */}
            {(() => {
              const currentVm = INDIVIDUAL_PRACTICE_VMS[selectedVmId];
              const state = vmStates[selectedVmId];
              const isRunning = state.status === 'running';

              return (
                <div className={`bg-[#12161f] border rounded-2xl p-5 transition ${currentVm.borderColor}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded uppercase ${currentVm.bgBadge} ${currentVm.color} border ${currentVm.borderColor}`}>
                          {currentVm.type}
                        </span>
                        <h1 className="text-xl font-bold text-white">{currentVm.name}</h1>
                      </div>
                      <p className="text-xs text-slate-300 font-sans max-w-3xl">{currentVm.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 text-white font-bold">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" /> IP: {currentVm.ip}
                        </span>
                        <span>•</span>
                        <span>OS: {currentVm.os}</span>
                        <span>•</span>
                        <span>Specs: {currentVm.specs}</span>
                      </div>
                    </div>

                    {/* Machine Actions */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <button
                        onClick={() => copyToClipboard(currentVm.ip)}
                        className="px-3 py-2 rounded-xl bg-[#0a0d14] hover:bg-[#1a2130] border border-slate-700 text-slate-300 flex items-center gap-1.5 transition"
                        title="Copy IP"
                      >
                        {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy IP</span>
                      </button>

                      <button
                        onClick={() => restartVm(selectedVmId)}
                        disabled={!isRunning}
                        className="px-3 py-2 rounded-xl bg-[#0a0d14] hover:bg-[#1a2130] border border-slate-700 text-cyan-300 flex items-center gap-1.5 transition disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reboot
                      </button>

                      <button
                        onClick={() => toggleVmPower(selectedVmId)}
                        className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm ${
                          isRunning 
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                        <span>{isRunning ? 'Power Off' : 'Power On VM'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* =====================================================================
                MACHINE 1: KALI LINUX ATTACKBOX FULL CONSOLE
            ===================================================================== */}
            {selectedVmId === 'kali' && (
              <div className="bg-[#0b0e14] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
                {/* Kali Terminal Top Bar */}
                <div className="bg-[#151922] px-4 py-3 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="text-emerald-400 font-bold ml-1">kali@hackrange</span>
                    <span className="text-slate-500">: ~ (zsh console)</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="text-emerald-300">NIC: eth0 (10.10.142.10)</span>
                    <button onClick={() => setKaliTerminalLogs([])} className="hover:text-white">clear</button>
                  </div>
                </div>

                {/* Kali Terminal Logs */}
                <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2 select-text leading-relaxed">
                  {kaliTerminalLogs.map((log, index) => (
                    <div key={index}>
                      {log.type === 'cmd' && <div className="text-emerald-400 font-bold">{log.text}</div>}
                      {log.type === 'sys' && <div className="text-slate-500">{log.text}</div>}
                      {log.type === 'info' && <div className="text-slate-300 whitespace-pre-wrap">{log.text}</div>}
                      {log.type === 'output' && (
                        <div className="text-slate-200 whitespace-pre-wrap bg-[#10141d] p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] my-1">
                          {log.text}
                        </div>
                      )}
                      {log.type === 'error' && <div className="text-rose-400">{log.text}</div>}
                    </div>
                  ))}
                  <div ref={kaliEndRef} />
                </div>

                {/* Quick Kali Command Launcher */}
                <div className="px-4 py-2 bg-[#0e1219] border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-500 font-bold">Quick Probes:</span>
                  <button 
                    onClick={() => { setKaliInput('nmap -sV 10.10.142.80'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-cyan-300 border border-slate-700"
                  >
                    nmap DVWA (80)
                  </button>
                  <button 
                    onClick={() => { setKaliInput('nmap -sV -p 21,22,23,80,139,445 10.10.142.81'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-amber-300 border border-slate-700"
                  >
                    nmap Meta2 (81)
                  </button>
                  <button 
                    onClick={() => { setKaliInput('curl -I http://10.10.142.80/'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-slate-300 border border-slate-700"
                  >
                    curl headers
                  </button>
                  <button 
                    onClick={() => { setKaliInput('nikto -h 10.10.142.80'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-emerald-300 border border-slate-700"
                  >
                    nikto scan
                  </button>
                  <button 
                    onClick={() => { setKaliInput('ping -c 3 10.10.142.80'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-slate-400 border border-slate-700"
                  >
                    ping test
                  </button>
                </div>

                {/* Kali Input Form */}
                <form onSubmit={handleKaliCommand} className="p-3 bg-[#111620] border-t border-slate-800 flex items-center gap-2 font-mono text-xs">
                  <span className="text-emerald-400 font-bold">kali@hackrange:~$</span>
                  <input
                    type="text"
                    value={kaliInput}
                    onChange={(e) => setKaliInput(e.target.value)}
                    placeholder="type commands: 'nmap 10.10.142.80', 'ping', 'curl', 'ifconfig'..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono p-0 focus:ring-0"
                  />
                  <button type="submit" className="text-slate-400 hover:text-emerald-400">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* =====================================================================
                MACHINE 2: DVWA TARGET - SPLIT VIEW (WEB GUI + APACHE/PHP SHELL)
            ===================================================================== */}
            {selectedVmId === 'dvwa' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px]">
                {/* Left: In-Browser Simulated DVWA Web Interface */}
                <div className="lg:col-span-7 bg-[#0f141d] border border-cyan-500/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                  {/* Browser Address Bar Header */}
                  <div className="bg-[#171e2c] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-slate-400">Target Web App:</span>
                      <span className="text-cyan-300 font-bold">http://10.10.142.80/dvwa/</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Security:</span>
                      <select
                        value={dvwaGuiState.securityLevel}
                        onChange={(e) => setDvwaGuiState({ ...dvwaGuiState, securityLevel: e.target.value })}
                        className="bg-[#0b0e14] border border-slate-700 text-cyan-300 rounded px-2 py-0.5 text-xs font-bold focus:outline-none"
                      >
                        <option value="low">Low (Vulnerable)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="impossible">Impossible (Secure)</option>
                      </select>
                    </div>
                  </div>

                  {/* DVWA Web Body */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar of DVWA */}
                    <div className="w-48 bg-[#121722] border-r border-slate-800 p-3 space-y-1 text-xs font-mono">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2">Vulnerabilities</span>
                      {[
                        { id: 'sqli', name: 'SQL Injection' },
                        { id: 'exec', name: 'Command Injection' },
                        { id: 'xss_r', name: 'Reflected XSS' },
                        { id: 'fi', name: 'File Inclusion' }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setDvwaGuiState({ ...dvwaGuiState, activeModule: m.id })}
                          className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                            dvwaGuiState.activeModule === m.id ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 px-2">
                        DB: MariaDB 10.11<br />PHP: 8.2.18
                      </div>
                    </div>

                    {/* Active Module Work Area */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs font-sans">
                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          Vulnerability: {dvwaGuiState.activeModule.toUpperCase()}
                        </h3>
                        <p className="text-slate-400 text-xs">Security Level: <strong className="text-cyan-300 uppercase">{dvwaGuiState.securityLevel}</strong></p>
                      </div>

                      {/* SQL Injection Module */}
                      {dvwaGuiState.activeModule === 'sqli' && (
                        <div className="space-y-3">
                          <p className="text-slate-300 text-xs">Enter User ID to query database table:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={dvwaGuiState.sqliInput}
                              onChange={(e) => setDvwaGuiState({ ...dvwaGuiState, sqliInput: e.target.value })}
                              placeholder="e.g. 1 or 1' OR '1'='1"
                              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded-lg p-2 text-xs font-mono text-white"
                            />
                            <button
                              onClick={runDvwaWebTest}
                              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-lg"
                            >
                              Submit
                            </button>
                          </div>

                          <div className="space-y-1 pt-2">
                            <span className="text-[11px] font-mono text-slate-400">Database Output:</span>
                            <div className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 min-h-[140px] overflow-y-auto">
                              {dvwaGuiState.sqliOutput ? (
                                dvwaGuiState.sqliOutput.map((row, i) => (
                                  <div key={i} className="py-1 border-b border-slate-800/60 last:border-none">
                                    <span className="text-cyan-400">ID: {row.id}</span> | First name: {row.first} | Surname: {row.surname}
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500">Query result will appear here...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Command Execution Module */}
                      {dvwaGuiState.activeModule === 'exec' && (
                        <div className="space-y-3">
                          <p className="text-slate-300 text-xs">Ping a remote IP address:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={dvwaGuiState.execInput}
                              onChange={(e) => setDvwaGuiState({ ...dvwaGuiState, execInput: e.target.value })}
                              placeholder="e.g. 127.0.0.1; whoami"
                              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded-lg p-2 text-xs font-mono text-white"
                            />
                            <button
                              onClick={runDvwaWebTest}
                              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-lg"
                            >
                              Submit
                            </button>
                          </div>

                          <div className="space-y-1 pt-2">
                            <span className="text-[11px] font-mono text-slate-400">Command Output:</span>
                            <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300 min-h-[140px] whitespace-pre-wrap">
                              {dvwaGuiState.execOutput || 'Ping response will render here...'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* File Inclusion Module */}
                      {dvwaGuiState.activeModule === 'fi' && (
                        <div className="space-y-3">
                          <p className="text-slate-300 text-xs">File parameter (include.php):</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={dvwaGuiState.fiInput}
                              onChange={(e) => setDvwaGuiState({ ...dvwaGuiState, fiInput: e.target.value })}
                              placeholder="e.g. ../../../../etc/passwd"
                              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded-lg p-2 text-xs font-mono text-white"
                            />
                            <button
                              onClick={runDvwaWebTest}
                              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-lg"
                            >
                              Include
                            </button>
                          </div>

                          <div className="space-y-1 pt-2">
                            <span className="text-[11px] font-mono text-slate-400">File Contents:</span>
                            <pre className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3 font-mono text-xs text-amber-300 min-h-[140px] whitespace-pre-wrap">
                              {dvwaGuiState.fiOutput || 'File stream will display here...'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Reflected XSS Module */}
                      {dvwaGuiState.activeModule === 'xss_r' && (
                        <div className="space-y-3">
                          <p className="text-slate-300 text-xs">What is your name?</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={dvwaGuiState.xssInput}
                              onChange={(e) => setDvwaGuiState({ ...dvwaGuiState, xssInput: e.target.value })}
                              placeholder="<script>alert(1)</script>"
                              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded-lg p-2 text-xs font-mono text-white"
                            />
                            <button
                              onClick={runDvwaWebTest}
                              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-lg"
                            >
                              Submit
                            </button>
                          </div>

                          <div className="space-y-1 pt-2">
                            <span className="text-[11px] font-mono text-slate-400">Rendered Output:</span>
                            <div className="bg-[#0b0e14] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 min-h-[140px]">
                              {dvwaGuiState.xssOutput ? (
                                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800 text-cyan-300">
                                  Hello {dvwaGuiState.xssOutput}
                                </div>
                              ) : (
                                <span className="text-slate-500">Output will display here...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                {/* Right: DVWA Target Linux Backend Console */}
                <div className="lg:col-span-5 bg-[#0b0e14] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                  <div className="bg-[#151922] px-4 py-3 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
                    <span className="text-cyan-400 font-bold">www-data@dvwa-server (Debian Shell)</span>
                    <button onClick={() => setDvwaTerminalLogs([])} className="text-slate-500 hover:text-white text-[11px]">clear</button>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2 select-text leading-relaxed">
                    {dvwaTerminalLogs.map((log, index) => (
                      <div key={index}>
                        {log.type === 'cmd' && <div className="text-cyan-400 font-bold">{log.text}</div>}
                        {log.type === 'sys' && <div className="text-slate-500">{log.text}</div>}
                        {log.type === 'info' && <div className="text-slate-300 whitespace-pre-wrap">{log.text}</div>}
                        {log.type === 'output' && (
                          <div className="text-slate-200 whitespace-pre-wrap bg-[#10141d] p-2.5 rounded border border-slate-800 font-mono text-[11px] my-1">
                            {log.text}
                          </div>
                        )}
                        {log.type === 'error' && <div className="text-rose-400">{log.text}</div>}
                      </div>
                    ))}
                    <div ref={dvwaEndRef} />
                  </div>

                  <form onSubmit={handleDvwaCommand} className="p-3 bg-[#111620] border-t border-slate-800 flex items-center gap-2 font-mono text-xs">
                    <span className="text-cyan-400 font-bold">www-data$</span>
                    <input
                      type="text"
                      value={dvwaInput}
                      onChange={(e) => setDvwaInput(e.target.value)}
                      placeholder="try 'ls', 'cat config/config.inc.php', 'whoami'..."
                      className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono p-0 focus:ring-0"
                    />
                  </form>
                </div>
              </div>
            )}

            {/* =====================================================================
                MACHINE 3: METASPLOITABLE 2 TARGET - DAEMON NODE REAL SHELL
            ===================================================================== */}
            {selectedVmId === 'metasploitable' && (
              <div className="bg-[#0b0e14] border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
                {/* Meta2 Console Top Bar */}
                <div className="bg-[#171a22] px-4 py-3 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-amber-400 font-bold">msfadmin@metasploitable</span>
                    <span className="text-slate-500">: ~# (Daemon Server Root Shell)</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="text-amber-300">Target IP: 10.10.142.81</span>
                    <button onClick={() => setMetaTerminalLogs([])} className="hover:text-white">clear</button>
                  </div>
                </div>

                {/* Meta2 Terminal Logs */}
                <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2 select-text leading-relaxed">
                  {metaTerminalLogs.map((log, index) => (
                    <div key={index}>
                      {log.type === 'cmd' && <div className="text-amber-400 font-bold">{log.text}</div>}
                      {log.type === 'sys' && <div className="text-slate-500">{log.text}</div>}
                      {log.type === 'info' && <div className="text-slate-300 whitespace-pre-wrap">{log.text}</div>}
                      {log.type === 'output' && (
                        <div className="text-slate-200 whitespace-pre-wrap bg-[#10141d] p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] my-1">
                          {log.text}
                        </div>
                      )}
                      {log.type === 'error' && <div className="text-rose-400">{log.text}</div>}
                    </div>
                  ))}
                  <div ref={metaEndRef} />
                </div>

                {/* Quick Server Inspection Launcher */}
                <div className="px-4 py-2 bg-[#0e1219] border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-500 font-bold">Daemon Commands:</span>
                  <button 
                    onClick={() => { setMetaInput('netstat -tulpn'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-amber-300 border border-slate-700"
                  >
                    netstat -tulpn
                  </button>
                  <button 
                    onClick={() => { setMetaInput('cat /etc/shadow'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-rose-300 border border-slate-700"
                  >
                    cat /etc/shadow
                  </button>
                  <button 
                    onClick={() => { setMetaInput('cat /etc/issue'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-slate-300 border border-slate-700"
                  >
                    cat /etc/issue
                  </button>
                  <button 
                    onClick={() => { setMetaInput('ps aux | grep vsftpd'); }}
                    className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#20293a] text-cyan-300 border border-slate-700"
                  >
                    check vsftpd
                  </button>
                </div>

                {/* Meta2 Input Form */}
                <form onSubmit={handleMetaCommand} className="p-3 bg-[#111620] border-t border-slate-800 flex items-center gap-2 font-mono text-xs">
                  <span className="text-amber-400 font-bold">msfadmin@metasploitable:~#</span>
                  <input
                    type="text"
                    value={metaInput}
                    onChange={(e) => setMetaInput(e.target.value)}
                    placeholder="type 'netstat -tulpn', 'cat /etc/shadow', 'help'..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono p-0 focus:ring-0"
                  />
                  <button type="submit" className="text-slate-400 hover:text-amber-400">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

        {/* =========================================================================
            VIEW 2: SYLLABUS LAB ROOM & 6-PART STRUCTURED MANUAL
        ========================================================================= */}
        {currentView === 'room' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Lab Tasks */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-[#12161f] border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      LAB #{String(activeLab.id).padStart(2, '0')}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getDifficultyPill(activeLab.difficulty)}`}>
                      {activeLab.difficulty}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {SEED_TRACKS.find(t => t.id === activeLab.trackId)?.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">+{activeLab.rewardXp} XP</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-white">{activeLab.title}</h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{activeLab.manual.objective}</p>
              </div>

              {/* Task Checklist */}
              <div className="space-y-4">
                {activeLab.tasks.map((task, idx) => {
                  const isCompleted = user.completedTaskIds.includes(task.id);
                  const isIncorrect = taskStatus[task.id] === 'incorrect';

                  return (
                    <div 
                      key={task.id}
                      className={`bg-[#12161f] border rounded-xl overflow-hidden transition-all ${
                        isCompleted ? 'border-emerald-600/40 bg-[#0e1814]' : 'border-slate-800'
                      }`}
                    >
                      <div className="px-4 py-2.5 bg-[#171c26] border-b border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-xs text-white">Task {idx + 1}</span>
                        {isCompleted && (
                          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                            <Check className="w-3.5 h-3.5" /> Solved
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <p className="text-xs sm:text-sm text-slate-200">{task.title}</p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <input
                            type="text"
                            placeholder={task.format || "Answer format..."}
                            value={taskInputs[task.id] || ''}
                            onChange={(e) => setTaskInputs({ ...taskInputs, [task.id]: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCheckAnswer(task); }}
                            className={`flex-1 bg-[#090c10] border rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none ${
                              isCompleted ? 'border-emerald-700' : isIncorrect ? 'border-rose-600' : 'border-slate-700'
                            }`}
                          />
                          <button
                            onClick={() => handleCheckAnswer(task)}
                            className="px-4 py-2 rounded text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                          >
                            Submit
                          </button>
                        </div>
                        <div>
                          <button
                            onClick={() => setRevealedHints(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            <HelpCircle className="w-3 h-3 text-amber-400" />
                            <span>{revealedHints[task.id] ? 'Hide Hint' : 'Show Hint'}</span>
                          </button>
                          {revealedHints[task.id] && (
                            <div className="mt-2 p-2.5 rounded bg-[#0b0e14] border border-slate-800 text-xs font-mono text-amber-300">
                              {activeLab.hint}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Manual & Terminal Tabs */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#12161f] p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 text-xs font-mono">
                <button
                  onClick={() => setActivePaneTab('manual')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activePaneTab === 'manual' ? 'bg-[#1e2636] text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> 6-Part Manual
                </button>
                <button
                  onClick={() => setActivePaneTab('docker')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activePaneTab === 'docker' ? 'bg-[#1e2636] text-purple-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" /> Docker Spec
                </button>
              </div>

              {/* 6-Part Manual */}
              {activePaneTab === 'manual' && (
                <div className="bg-[#12161f] border border-slate-800 rounded-xl p-5 h-[560px] overflow-y-auto space-y-4 text-xs">
                  <div className="border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" /> Structured Lab Manual
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">LAB #{activeLab.id}: {activeLab.title}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-mono font-bold text-emerald-400 uppercase text-[11px]">1. Objective</h4>
                    <p className="text-slate-300 leading-relaxed">{activeLab.manual.objective}</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-mono font-bold text-cyan-400 uppercase text-[11px]">2. Environment Setup</h4>
                    <p className="text-slate-300 leading-relaxed bg-[#090c10] p-2.5 rounded border border-slate-800 font-mono text-[11px]">
                      {activeLab.manual.setup}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-mono font-bold text-amber-400 uppercase text-[11px]">3. Sequential Procedure Steps</h4>
                    <div className="space-y-1 bg-[#090c10] p-3 rounded border border-slate-800 font-mono text-[11px] text-slate-300">
                      {activeLab.manual.steps.map((s, i) => (
                        <div key={i} className="leading-relaxed">{s}</div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-mono font-bold text-purple-400 uppercase text-[11px]">4. Expected Outcome</h4>
                    <p className="text-slate-300 leading-relaxed">{activeLab.manual.expectedOutcome}</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-mono font-bold text-rose-400 uppercase text-[11px]">5. Defensive Measures & Best Practices</h4>
                    <p className="text-slate-300 leading-relaxed">{activeLab.manual.bestPractices}</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-mono font-bold text-blue-400 uppercase text-[11px]">6. Quick Cheat-Sheet</h4>
                    <div className="bg-[#090c10] p-2.5 rounded border border-slate-800 font-mono text-[11px] text-emerald-300 select-all">
                      {activeLab.manual.cheatSheet}
                    </div>
                  </div>
                </div>
              )}

              {/* Docker Spec Tab */}
              {activePaneTab === 'docker' && (
                <div className="bg-[#12161f] border border-slate-800 rounded-xl p-5 h-[560px] overflow-y-auto space-y-4 font-mono text-xs">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Boxes className="w-4 h-4 text-purple-400" /> Container Orchestration
                  </h3>
                  <div className="bg-[#090c10] p-3 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-slate-400">Image: <span className="text-cyan-300">{activeLab.docker.image}</span></div>
                    <div className="text-slate-400">Container: <span className="text-white">{activeLab.docker.containerName}</span></div>
                    <div className="text-slate-400">Ports: <span className="text-amber-300">{activeLab.docker.ports.join(', ')}</span></div>
                    <div className="text-slate-400">Resource Limits: <span className="text-emerald-300">{activeLab.docker.memLimit} / {activeLab.docker.cpuLimit}</span></div>
                  </div>
                  <pre className="bg-[#090c10] p-3 rounded-lg border border-slate-800 text-slate-300 text-[11px] overflow-x-auto">
                    {activeLab.docker.composeFile}
                  </pre>
                </div>
              )}

              {/* Syllabus Dropdown Switcher */}
              <div className="bg-[#12161f] border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-xs font-mono font-bold text-white block">Switch Syllabus Room (24 Labs):</span>
                <select
                  value={activeLabId}
                  onChange={(e) => setActiveLabId(Number(e.target.value))}
                  className="w-full bg-[#090c10] border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200"
                >
                  {SEED_LABS.map(l => (
                    <option key={l.id} value={l.id}>
                      #{String(l.id).padStart(2, '0')}. {l.title} ({l.difficulty})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: COMPLETE 24 LABS CATALOG
        ========================================================================= */}
        {currentView === 'catalog' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Complete 24-Topic Syllabus Directory</h2>
                <p className="text-xs text-slate-400 mt-1">Explore all practical topics across Recon, Web, Network, and Infrastructure tracks.</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search labs..."
                  className="bg-[#12161f] border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
                />
                <select
                  value={selectedTrackFilter}
                  onChange={(e) => setSelectedTrackFilter(e.target.value)}
                  className="bg-[#12161f] border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
                >
                  <option value="all">All Tracks</option>
                  <option value="recon">Reconnaissance</option>
                  <option value="web">Web Attacks</option>
                  <option value="network">Network</option>
                  <option value="infra">Infrastructure</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLabs.map((lab) => (
                <div
                  key={lab.id}
                  onClick={() => { setActiveLabId(lab.id); setCurrentView('room'); }}
                  className="bg-[#12161f] border border-slate-800 hover:border-slate-600 rounded-xl p-5 space-y-3 cursor-pointer transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400">#{String(lab.id).padStart(2, '0')}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getDifficultyPill(lab.difficulty)}`}>
                        {lab.difficulty}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{lab.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{lab.manual.objective}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-emerald-400">
                    <span>+{lab.rewardXp} XP</span>
                    <span>Launch Lab &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}