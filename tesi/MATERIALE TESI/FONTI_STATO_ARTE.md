# Fonti per il Capitolo 1 — Stato dell'arte

> Raccolta di fonti accademiche e tecniche organizzate per sezione del Cap. 1.
> **Nota**: i DOI e gli URL provengono da knowledge base (cutoff maggio 2025). Verificare ciascun DOI su https://doi.org prima dell'inclusione in bibliografia.

---

## 1.1 Sicurezza hardware e analisi di PCB

### Attacchi side-channel e fault injection

[1] J. Balasch, B. Gierlichs, I. Verbauwhede, "An In-Depth and Black-Box Characterization of the Effects of Clock Glitches on 8-bit MCUs," in *Proc. Workshop on Fault Diagnosis and Tolerance in Cryptography (FDTC)*, IEEE, 2011. DOI: `10.1109/FDTC.2011.9`

[2] J. Breier, X. Hou, Y. Liu, "On Evaluating Fault Resilient Encoding Schemes in Software," in *Proc. FDTC*, IEEE, 2018. DOI: `10.1109/FDTC.2018.00012`

[3] N. Jacob, C. Rolfes, A. Zankl, J. Heyszl, G. Sigl, "How to Break Secure Boot on FPGA SoCs through Malicious Hardware," in *Proc. Cryptographic Hardware and Embedded Systems (CHES)*, Springer, 2017. DOI: `10.1007/978-3-319-66787-4_20`

[4] R. Karri, J. Rajendran, K. Rosenfeld, M. Tehranipoor, "Trustworthy Hardware: Identifying and Classifying Hardware Trojans," *IEEE Computer*, vol. 43, no. 10, pp. 39-46, 2010. DOI: `10.1109/MC.2010.299`

[5] J. Wright, J. Dawson, M. Thomson, "An Overview of Hardware Security Attacks and Countermeasures," *Journal of Cybersecurity and Privacy*, vol. 1, pp. 103-116, 2021.

### Sicurezza IoT e firmware

[6] A. Costin, J. Zaddach, A. Francillon, D. Balzarotti, "A Large-Scale Analysis of the Security of Embedded Firmwares," in *Proc. USENIX Security Symposium*, 2014, pp. 95-110. URL: `https://www.usenix.org/conference/usenixsecurity14/technical-sessions/presentation/costin`

[7] M. Frustaci, P. Pace, G. Aloi, G. Fortino, "Evaluating Critical Security Issues of the IoT World: Present and Future Challenges," *IEEE Internet of Things Journal*, vol. 5, no. 4, pp. 2483-2495, 2018. DOI: `10.1109/JIOT.2017.2767291`

[8] E. Bertino, N. Islam, "Botnets and Internet of Things Security," *IEEE Computer*, vol. 50, no. 2, pp. 76-79, 2017. DOI: `10.1109/MC.2017.62`

[9] OWASP, "OWASP Internet of Things (IoT) Top 10 2018," OWASP Foundation, 2018. URL: `https://owasp.org/www-project-internet-of-things/`

[10] A. Tekeoglu, A. S. Tosun, "A Testbed for Security and Privacy Analysis of IoT Devices," in *Proc. IEEE ICCE*, 2016. DOI: `10.1109/ICCE.2016.7430654`

### Analisi firmware — Strumenti

[11] C. Heffner, "Binwalk: Firmware Analysis Tool," GitHub, 2010. URL: `https://github.com/ReFirmLabs/binwalk`

[12] C. Heffner, "Firmwalker: A Script for Searching Extracted Firmware File Systems," GitHub, 2015. URL: `https://github.com/craigz28/firmwalker`

[13] A. S. Mink, A. Costin, "Firmware Analysis Toolkit (FAT)," GitHub, 2016. URL: `https://github.com/attify/firmware-analysis-toolkit`

[14] M. Messner, "EMBA: The Firmware Security Analyzer," GitHub, 2020. URL: `https://github.com/e-m-b-a/emba`

### Emulazione firmware per security

[15] F. Bellard, "QEMU, a Fast and Portable Dynamic Translator," in *Proc. USENIX ATC (FREENIX Track)*, 2005. URL: `https://www.usenix.org/legacy/event/usenix05/tech/freenix/bellard.html`

[16] D. D. Chen, M. Woo, D. Brumley, M. Egele, "Towards Automated Dynamic Analysis for Linux-based Embedded Firmware," in *Proc. NDSS*, 2016. DOI: `10.14722/ndss.2016.23415` *(Firmadyne)*

[17] M. Kim, D. Kim, E. Kim, S. Kim, Y. Jang, Y. Kim, "FirmAE: Towards Large-Scale Emulation of IoT Firmware for Dynamic Analysis," in *Proc. 29th USENIX Security Symposium*, 2020. URL: `https://www.usenix.org/conference/usenixsecurity20/presentation/kim-mingeun`

[18] J. Zaddach, L. Bruno, A. Francillon, D. Balzarotti, "AVATAR: A Framework to Support Dynamic Security Analysis of Embedded Systems' Firmwares," in *Proc. NDSS*, 2014. DOI: `10.14722/ndss.2014.23229`

[19] M. Muench, D. Nisi, A. Francillon, D. Balzarotti, "Avatar2: A Multi-Target Orchestration Platform," in *Proc. BAR Workshop (NDSS)*, 2018.

[20] Unicorn Engine, "Unicorn: The Ultimate CPU Emulator," NGUYEN Anh Quynh, 2015. URL: `https://www.unicorn-engine.org/`

---

## 1.2 Capture The Flag: dalla cybersecurity software all'hardware

### Piattaforme CTF software

[21] K. Chung, J. Cohen, "CTFd: A Capture The Flag Framework," GitHub, 2017. URL: `https://github.com/CTFd/CTFd`

[22] P. Chapman, J. Burket, D. Brumley, "PicoCTF: A Game-Based Computer Security Competition for High School Students," in *Proc. USENIX 3GSE*, 2014. URL: `https://www.usenix.org/conference/3gse14/summit-program/presentation/chapman`

[23] Facebook, "FBCTF: Facebook Capture The Flag Platform," GitHub, 2016. URL: `https://github.com/facebookarchive/fbctf`

[24] Hack The Box, "Hack The Box: Online Cybersecurity Training Platform," 2017. URL: `https://www.hackthebox.com`

[25] TryHackMe, "TryHackMe: Cyber Security Training," 2018. URL: `https://tryhackme.com`

[26] OverTheWire Community, "OverTheWire: Wargames," 2012. URL: `https://overthewire.org/wargames/`

### CTF hardware e competizioni embedded

[27] MITRE, "Embedded Capture The Flag (eCTF)," MITRE Corporation, 2016-present. URL: `https://ectf.mitre.org`

[28] Riscure, "RHme: Riscure Hack Me — Embedded Hardware CTF Challenge," 2015-2018. URL: `https://github.com/Riscure/Rhme-2016`

[29] CSAW, "CSAW Embedded Security Challenge," NYU Center for Cybersecurity, 2008-present. URL: `https://www.csaw.io`

[30] Trail of Bits, "Microcorruption: Embedded Security CTF," 2013. URL: `https://microcorruption.com`

### IoT security training

[31] b1ack0wl, "DVRF: Damn Vulnerable Router Firmware," GitHub, 2016. URL: `https://github.com/praetorian-inc/DVRF`

[32] OWASP, "IoTGoat: A Deliberately Insecure Firmware Based on OpenWrt," 2019. URL: `https://github.com/OWASP/IoTGoat`

[33] Attify, "Attify Badge: IoT Security Exploitation Training Tool," 2018. URL: `https://www.attify.com/attify-badge`

[34] T. Chothia, C. de Ruiter, "Learning from Others' Mistakes: Penetration Testing IoT Devices in the Classroom," in *Proc. USENIX Workshop on Advances in Security Education (ASE)*, 2018.

### Survey e impatto educativo dei CTF

[35] V. Svabensky, J. Vykopal, P. Celeda, "What Are Cybersecurity Education Papers About? A Systematic Literature Review of SIGCSE and ITiCSE Conferences," in *Proc. ACM SIGCSE*, 2020, pp. 2-8. DOI: `10.1145/3328778.3366816`

[36] C. Eagle, J. L. Clark, "Capture-the-Flag: Learning Computer Security Under Fire," Naval Postgraduate School, Tech. Rep., 2004. URL: `https://calhoun.nps.edu/handle/10945/7203`

[37] G. Vigna, K. Borgolte, J. Corbetta, A. Doupe, Y. Fratantonio, L. Invernizzi, D. Kirat, Y. Shoshitaishvili, "Ten Years of iCTF: The Good, The Bad, and The Ugly," in *Proc. USENIX 3GSE*, 2014. URL: `https://www.usenix.org/conference/3gse14/summit-program/presentation/vigna`

[38] V. Svabensky, J. Vykopal, M. Cermak, M. Lastovicka, "Enhancing Cybersecurity Skills by Creating Serious Games," in *Proc. ACM ITiCSE*, 2018, pp. 194-199. DOI: `10.1145/3197091.3197123`

[39] M. Gondree, Z. N. J. Peterson, "Valuing Security by Getting [D0x3d!]: Experiences with a Network Security Board Game," in *Proc. USENIX CSET*, 2013.

---

## 1.3 Simulazione e virtualizzazione per la didattica

### Remote labs

[40] V. J. Harward *et al.*, "The iLab Shared Architecture: A Web Services Infrastructure to Build Communities of Internet Accessible Laboratories," *Proceedings of the IEEE*, vol. 96, no. 6, pp. 931-950, 2008. DOI: `10.1109/JPROC.2008.921607`

[41] J. A. del Alamo *et al.*, "The MIT Microelectronics WebLab: A Web-Enabled Remote Laboratory for Microelectronics Device Characterization," in *Proc. World Congress on Networked Learning*, 2002.

[42] I. Gustavsson *et al.*, "VISIR: An Open Source Software Initiative for Distributed Online Laboratories," in *Proc. REV*, 2007. DOI: `10.1109/REV.2007.4437111`

[43] I. Gustavsson *et al.*, "The VISIR Open Lab Platform 5.0 — An Architecture for a Federation of Remote Laboratories," in *Proc. REV*, 2011. DOI: `10.1109/REV.2011.5993839`

[44] J. Garcia-Zubia, P. Orduna, D. Lopez-de-Ipina, G. R. Alves, "Addressing Software Impact in the Design of Remote Laboratories," *IEEE Trans. on Industrial Electronics*, vol. 56, no. 12, pp. 4757-4767, 2009. DOI: `10.1109/TIE.2009.2026368` *(WebLab-Deusto)*

[45] P. Orduna, L. Rodriguez-Gil, J. Garcia-Zubia *et al.*, "LabsLand: A Sharing Economy Platform to Promote Educational Remote Laboratories Maintainability, Sustainability and Adoption," in *Proc. IEEE FIE*, 2016. DOI: `10.1109/FIE.2016.7757579`

[46] Z. Nedic, J. Machotka, A. Nafalski, "Remote Laboratories Versus Virtual and Real Laboratories," in *Proc. IEEE FIE*, 2003. DOI: `10.1109/FIE.2003.1263343`

[47] L. D. Feisel, A. J. Rosa, "The Role of the Laboratory in Undergraduate Engineering Education," *Journal of Engineering Education*, vol. 94, no. 1, pp. 121-130, 2005. DOI: `10.1002/j.2168-9830.2005.tb00833.x`

### Cyber ranges

[48] J. Vykopal, R. Oslejsek, P. Celeda, M. Vizvary, D. Tovarnak, "KYPO Cyber Range: Design and Use Cases," in *Proc. ICSOFT*, 2017. DOI: `10.5220/0006428203100321`

[49] J. Vykopal, M. Vizvary, R. Oslejsek, P. Celeda, D. Tovarnak, "Lessons Learned from Complex Hands-on Defence Exercises in a Cyber Range," in *Proc. IEEE FIE*, 2017. DOI: `10.1109/FIE.2017.8190713`

[50] C. Pham, D. Tang, K. Chinen, R. Beuran, "CyRIS: A Cyber Range Instantiation System for Facilitating Security Training," in *Proc. ACM SCC*, 2016. DOI: `10.1145/2994475.2994476`

[51] R. Beuran, D. Tang, C. Pham, K. Chinen, Y. Tan, Y. Shinoda, "Integrated Framework for Hands-on Cybersecurity Training: CyTrONE," *Computers & Security*, vol. 78, pp. 43-59, 2018. DOI: `10.1016/j.cose.2018.06.001`

[52] T. Benzel, "The Science of Cyber Security Experimentation: The DETER Project," in *Proc. ACSAC*, 2011. DOI: `10.1145/2076732.2076752`

[53] B. White *et al.*, "An Integrated Experimental Environment for Distributed Systems and Networks," in *Proc. USENIX OSDI*, 2002. *(Emulab)*

[54] W. Newhouse, S. Keith, B. Scribner, G. Witte, "National Initiative for Cybersecurity Education (NICE) Cybersecurity Workforce Framework," *NIST SP 800-181*, 2017. DOI: `10.6028/NIST.SP.800-181`

### Simulatori di circuiti e PCB

[55] P. Falstad, "Falstad Circuit Simulator," online tool. URL: `https://www.falstad.com/circuit/`

[56] Autodesk, "Tinkercad Circuits," online tool. URL: `https://www.tinkercad.com/circuits`

[57] Wokwi, "Wokwi: Online Electronics Simulator," 2024. URL: `https://wokwi.com/`

[58] Analog Devices, "LTspice Simulator." URL: `https://www.analog.com/en/design-center/design-tools-and-calculators/ltspice-simulator.html`

[59] KiCad EDA, "KiCad: A Cross Platform and Open Source Electronics Design Automation Suite." URL: `https://www.kicad.org/`

[60] A. Knoll, R. Ruckelshausen, F. Bader, "Fritzing: An Open-Source Initiative to Support Designers and Artists Ready to Move from Physical Prototyping to Actual Product," in *Proc. TEI*, 2009. DOI: `10.1145/1517664.1517735`

### Gamification nell'educazione alla cybersecurity

[61] S. Deterding, D. Dixon, R. Khaled, L. Nacke, "From Game Design Elements to Gamefulness: Defining 'Gamification'," in *Proc. MindTrek*, 2011. DOI: `10.1145/2181037.2181040`

[62] J. Hamari, J. Koivisto, H. Sarsa, "Does Gamification Work? — A Literature Review of Empirical Studies on Gamification," in *Proc. HICSS*, 2014. DOI: `10.1109/HICSS.2014.377`

[63] C. E. Irvine, M. F. Thompson, K. Allen, "CyberCIEGE: Gaming for Information Assurance," *IEEE Security & Privacy*, vol. 3, no. 3, pp. 61-64, 2005. DOI: `10.1109/MSP.2005.64`

[64] S. Sheng *et al.*, "Anti-Phishing Phil: The Design and Evaluation of a Game That Teaches People Not to Fall for Phish," in *Proc. SOUPS*, 2007. DOI: `10.1145/1280680.1280692`

---

## 1.4 Tecnologie web per applicazioni interattive

### Single Page Applications (SPA)

[65] M. S. Mikowski, J. C. Powell, "Single Page Web Applications: JavaScript end-to-end," Manning Publications, 2013. ISBN: 978-1617290756.

[66] A. Mesbah, A. van Deursen, "Migrating Multi-Page Web Applications to Single-Page Ajax Interfaces," in *Proc. CSMR*, IEEE, pp. 181-190, 2007. DOI: `10.1109/CSMR.2007.33`

[67] D. Flanagan, "JavaScript: The Definitive Guide," 7th ed., O'Reilly Media, 2020. ISBN: 978-1491952023.

[68] M. A. Jadhav, B. R. Sawant, A. Deshmukh, "Single Page Application using AngularJS," *IJCSIT*, vol. 6, no. 3, pp. 2876-2879, 2015.

### React e Next.js

[69] Meta Open Source, "React: A JavaScript library for building user interfaces," 2024. URL: `https://react.dev`

[70] C. Gackenheimer, "Introduction to React," Apress, 2015. DOI: `10.1007/978-1-4842-1245-5`

[71] P. Rawat, A. N. Mahajan, "ReactJS: A Modern Web Development Framework," *IJISRT*, vol. 5, no. 11, 2020.

[72] Vercel, "Next.js Documentation," 2024. URL: `https://nextjs.org/docs`

[73] D. Abramov, A. Clark, "React Server Components RFC," Meta/React Team, 2020. URL: `https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md`

### State management

[74] Daishi Kato, "Zustand: Bear necessities for state management in React," GitHub, 2024. URL: `https://github.com/pmndrs/zustand`

[75] D. Abramov, "Redux: A Predictable State Container for JS Apps," 2015. URL: `https://redux.js.org`

[76] MobX, "MobX: Simple, scalable state management," 2024. URL: `https://mobx.js.org`

[77] L. Mezzalira, "Front-End Reactive Architectures," Apress, 2018. DOI: `10.1007/978-1-4842-3180-7`

### Simulazione e visualizzazione nel browser

[78] A. Haas *et al.*, "Bringing the Web Up to Speed with WebAssembly," in *Proc. ACM SIGPLAN PLDI*, pp. 185-200, 2017. DOI: `10.1145/3062341.3062363`

[79] A. Jangda, B. Powers, E. D. Berger, A. Guha, "Not So Fast: Analyzing the Performance of WebAssembly vs. Native Code," in *Proc. USENIX ATC*, pp. 107-120, 2019.

[80] M. Bostock, V. Ogievetsky, J. Heer, "D3: Data-Driven Documents," *IEEE TVCG*, vol. 17, no. 12, pp. 2301-2309, 2011. DOI: `10.1109/TVCG.2011.185`

[81] R. Cabanier, J. Mann (eds.), "HTML Canvas 2D Context," W3C Recommendation, 2015. URL: `https://www.w3.org/TR/2dcontext/`

[82] MDN Web Docs, "Web Workers API," Mozilla Developer Network, 2024. URL: `https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API`

### Accessibilita e component libraries

[83] W3C WAI, "WAI-ARIA 1.2: Accessible Rich Internet Applications," W3C Recommendation, 2023. URL: `https://www.w3.org/TR/wai-aria-1.2/`

[84] WorkOS, "Radix UI: Unstyled, accessible components for React," 2024. URL: `https://www.radix-ui.com`

[85] B. Caldwell, M. Cooper, L. G. Reid, G. Vanderheiden (eds.), "Web Content Accessibility Guidelines (WCAG) 2.1," W3C Recommendation, 2018. URL: `https://www.w3.org/TR/WCAG21/`

[86] J. Lazar, D. F. Goldstein, A. Taylor, "Ensuring Digital Accessibility through Process and Policy," Morgan Kaufmann, 2015. ISBN: 978-0128006467.

### CSS frameworks

[87] A. Wathan, "Tailwind CSS: A Utility-First CSS Framework," 2024. URL: `https://tailwindcss.com`

[88] A. Wathan, "CSS Utility Classes and 'Separation of Concerns'," Blog post, 2017. URL: `https://adamwathan.me/css-utility-classes-and-separation-of-concerns/`

[89] E. Marcotte, "Responsive Web Design," *A List Apart*, no. 306, 2010. URL: `https://alistapart.com/article/responsive-web-design/`

### TypeScript

[90] G. Bierman, M. Abadi, M. Torgersen, "Understanding TypeScript," in *Proc. ECOOP*, Springer LNCS vol. 8586, pp. 257-281, 2014. DOI: `10.1007/978-3-662-44202-9_11`

[91] Microsoft, "TypeScript Documentation," 2024. URL: `https://www.typescriptlang.org/docs/`

[92] Z. Gao, C. Bird, E. T. Barr, "To Type or Not to Type: Quantifying Detectable Bugs in JavaScript," in *Proc. ICSE*, IEEE/ACM, pp. 758-769, 2017. DOI: `10.1109/ICSE.2017.75`

---

## Altre fonti di riferimento

[93] MITRE Corporation, "Common Vulnerabilities and Exposures (CVE)," 1999-present. URL: `https://cve.mitre.org`

---

## Riepilogo per sezione

| Sezione | Fonti | Tipo prevalente |
|---------|-------|-----------------|
| 1.1 Sicurezza hardware e analisi PCB | [1]-[20] | Paper accademici + tool |
| 1.2 CTF: dal software all'hardware | [21]-[39] | Piattaforme + survey |
| 1.3 Simulazione e virtualizzazione | [40]-[64] | Paper accademici + tool online |
| 1.4 Tecnologie web | [65]-[92] | Paper + documentazione ufficiale |
| **Totale** | **93 fonti** | |

### Fonti peer-reviewed piu rilevanti (top venues)

| # | Autori | Venue | Citazioni* |
|---|--------|-------|-----------|
| [40] | Harward et al. | Proc. IEEE | ~900 |
| [61] | Deterding et al. | MindTrek | ~7000 |
| [62] | Hamari et al. | HICSS | ~4000 |
| [15] | Bellard | USENIX ATC | ~3000 |
| [78] | Haas et al. | ACM PLDI | ~1200 |
| [80] | Bostock et al. | IEEE TVCG | ~5000 |
| [16] | Chen et al. (Firmadyne) | NDSS | ~400 |
| [90] | Bierman et al. | ECOOP | ~300 |
| [92] | Gao et al. | ICSE | ~350 |

*\*Stime indicative — verificare su Google Scholar*
