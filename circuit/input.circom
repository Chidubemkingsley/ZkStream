//Compiled via zkrepl.dev

pragma circom 2.1.6;

include "circomlib/poseidon.circom";

template StreamProof() {
    signal input dataHash;   // Poseidon(data)
    signal input timestamp;
    signal output commitment;

    component hash = Poseidon(2);
    hash.inputs[0] <== dataHash;
    hash.inputs[1] <== timestamp;

    commitment <== hash.out;
}

component main = StreamProof();

/* INPUT = {
    "dataHash": "1234567890",
    "timestamp": "1695200000"
} */

