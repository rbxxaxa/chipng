#include <stdint.h>
#include <stdlib.h>

typedef struct {
    int x;
    int y;
} Pair;

// Dynamic allocation for a 2D array of ints
int** create2DArrayInt(int height, int width, int init) {
    int** arr = malloc(height * sizeof(int*));
    for (int i = 0; i < height; i++) {
        arr[i] = malloc(width * sizeof(int));
        for (int j = 0; j < width; j++) {
            arr[i][j] = init;
        }
    }
    return arr;
}

// Dynamic allocation for a 2D array of booleans (as ints)
int** create2DArrayBool(int height, int width, int init) {
    int** arr = malloc(height * sizeof(int*));
    for (int i = 0; i < height; i++) {
        arr[i] = malloc(width * sizeof(int));
        for (int j = 0; j < width; j++) {
            arr[i][j] = init;
        }
    }
    return arr;
}

// Function to free a 2D array
void free2DArray(int** arr, int height) {
    for (int i = 0; i < height; i++) {
        free(arr[i]);
    }
    free(arr);
}

void process_pixels(uint8_t *data, int width, int height) {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            // invert colors
            int idx = (y * width + x) * 4;
            data[idx + 0] = 255 - data[idx + 0];
            data[idx + 1] = 255 - data[idx + 1];
            data[idx + 2] = 255 - data[idx + 2];
        }
    }
}