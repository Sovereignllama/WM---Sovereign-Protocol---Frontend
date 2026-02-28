/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sovereign_engine_v3.json`.
 */
export type SovereignEngineV3 = {
  "address": "SovTXTTvFW3KDxaxBQ5jwL2wTzPQtdXBbwDr3PJgpmy",
  "metadata": {
    "name": "sovereignEngineV3",
    "version": "1.0.0-beta.1",
    "spec": "0.1.0",
    "description": "$overeign Liquid — CPAMM + BinArray Settlement Engine (V3)"
  },
  "instructions": [
    {
      "name": "allocateBinPage",
      "docs": [
        "Allocate the next BinArray page (permissionless).",
        "Anyone can call this to prepare pages for future swaps."
      ],
      "discriminator": [
        180,
        180,
        207,
        22,
        195,
        2,
        14,
        89
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "binArray",
          "docs": [
            "New BinArray page — created here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "arg",
                "path": "pageIndex"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pageIndex",
          "type": "u32"
        }
      ]
    },
    {
      "name": "claimCreatorFees",
      "docs": [
        "Creator fee claim (their share of swap fees, post-recovery)."
      ],
      "discriminator": [
        0,
        23,
        125,
        234,
        156,
        118,
        134,
        89
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineGorVault",
          "docs": [
            "GOR vault to pay from"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimLpFees",
      "docs": [
        "LP fee claim — authority-gated, called via CPI from main program."
      ],
      "discriminator": [
        72,
        86,
        212,
        142,
        60,
        38,
        74,
        75
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The authority (sovereign PDA) — signs via CPI from main program"
          ],
          "signer": true,
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "recipient",
          "docs": [
            "Recipient of claimed GOR (the NFT holder, passed by main program)"
          ],
          "writable": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "lpClaim",
          "docs": [
            "LP claim record — init_if_needed for first-time claims"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  108,
                  112,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "enginePool"
              },
              {
                "kind": "arg",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine pool GOR vault (native SOL PDA)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "Pays for claim record init if needed"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "depositor",
          "type": "pubkey"
        },
        {
          "name": "depositAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeBinArray",
      "docs": [
        "Close a BinArray page and return rent to creator.",
        "Pool must be Unwound. Call once per page."
      ],
      "discriminator": [
        68,
        174,
        88,
        80,
        181,
        204,
        19,
        224
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can crank — just pays tx fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "binArray",
          "docs": [
            "The BinArray page to close."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "arg",
                "path": "binArrayPageIndex"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Creator wallet — receives the reclaimed rent."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "binArrayPageIndex",
          "type": "u32"
        }
      ]
    },
    {
      "name": "closeEnginePool",
      "docs": [
        "Close the EnginePool account and return rent to creator.",
        "Pool must be Unwound. Call after all BinArrays are closed."
      ],
      "discriminator": [
        107,
        111,
        131,
        180,
        37,
        91,
        21,
        227
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can crank — just pays tx fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Creator wallet — receives the reclaimed rent."
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createPool",
      "docs": [
        "Create a new engine pool with BinArray page 0.",
        "Called via CPI from the main sovereign-liquidity program."
      ],
      "discriminator": [
        233,
        146,
        209,
        142,
        207,
        104,
        64,
        188
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "Authority — must be the sovereign PDA (signs via CPI)"
          ],
          "signer": true
        },
        {
          "name": "sovereign"
        },
        {
          "name": "enginePool",
          "docs": [
            "The engine pool account to initialize"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "binArray",
          "docs": [
            "BinArray page 0 — pre-allocated by the caller (sovereign-liquidity)",
            "because Solana limits realloc to 10,240 bytes inside CPI.",
            "The caller creates the account with the correct size + PDA before CPI.",
            "We verify the seeds/owner and then load_init() here.",
            "Seeds are validated above. We call load_init() to initialize the zero_copy data."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "The sovereign token mint"
          ]
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine GOR vault (native SOL PDA)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "Engine token vault — initialized here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "sourceTokenVault",
          "docs": [
            "Source token vault (main program's token_vault)"
          ],
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "Optional: Creator's token ATA for buy-in tokens"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createPoolParams"
            }
          }
        }
      ]
    },
    {
      "name": "drainPool",
      "docs": [
        "Emergency drain of all pool assets — governance only."
      ],
      "discriminator": [
        22,
        179,
        191,
        145,
        255,
        51,
        125,
        70
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority (sovereign PDA) — signs via CPI"
          ],
          "signer": true,
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine GOR vault"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "Engine token vault"
          ],
          "writable": true
        },
        {
          "name": "tokenMint",
          "docs": [
            "Token mint"
          ]
        },
        {
          "name": "recipientSol",
          "docs": [
            "Recipient for drained GOR (main program's sol_vault)"
          ],
          "writable": true
        },
        {
          "name": "recipientToken",
          "docs": [
            "Recipient for drained tokens (main program's token_vault)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "extendBinArray",
      "docs": [
        "Extend a pre-allocated BinArray to target_len bytes (max +10,240 per call).",
        "Call multiple times to reach BinArray::LEN (32,816 bytes)."
      ],
      "discriminator": [
        51,
        204,
        198,
        234,
        232,
        223,
        38,
        136
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign"
        },
        {
          "name": "binArray",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "targetLen",
          "type": "u32"
        }
      ]
    },
    {
      "name": "pausePool",
      "docs": [
        "Pause trading — governance only."
      ],
      "discriminator": [
        160,
        15,
        12,
        189,
        160,
        0,
        243,
        245
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "prepareBinArray",
      "docs": [
        "Pre-allocate BinArray page 0 for a sovereign.",
        "Must be called BEFORE finalize_engine_pool (typically in the same tx).",
        "Needed because Solana limits CPI account allocations to 10,240 bytes."
      ],
      "discriminator": [
        103,
        150,
        203,
        4,
        72,
        207,
        167,
        54
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign"
        },
        {
          "name": "binArray",
          "docs": [
            "Seeds validated by constraint; account must not already exist."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "reconcileGorReserve",
      "docs": [
        "One-time migration: reconcile gor_reserve with actual vault balance.",
        "Fixes pools where bin fees accumulated in the vault but were not",
        "credited to gor_reserve (pre-fix accounting). Authority-gated."
      ],
      "discriminator": [
        154,
        231,
        211,
        38,
        44,
        49,
        179,
        40
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine GOR vault — read balance to compute correct gor_reserve"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "swapBuy",
      "docs": [
        "Buy tokens with GOR (native SOL). CPAMM pricing within bins.",
        "Pass overflow BinArray page in remaining_accounts[0] if buy",
        "may cross a 512-bin page boundary."
      ],
      "discriminator": [
        76,
        98,
        154,
        93,
        42,
        113,
        62,
        139
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine GOR vault PDA (native SOL)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "Engine token vault"
          ],
          "writable": true
        },
        {
          "name": "traderTokenAccount",
          "docs": [
            "Trader's token ATA"
          ],
          "writable": true
        },
        {
          "name": "binArray",
          "docs": [
            "Active BinArray page (contains the current frontier bin).",
            "Loaded via manual bytemuck cast (no AccountLoader overhead)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gorInput",
          "type": "u64"
        },
        {
          "name": "minTokensOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swapSell",
      "docs": [
        "Sell tokens for GOR. Locked-rate settlement from bins.",
        "Pass lower BinArray page in remaining_accounts[0] if sell",
        "may cross DOWN a page boundary."
      ],
      "discriminator": [
        176,
        40,
        55,
        165,
        110,
        62,
        84,
        97
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine GOR vault PDA (native SOL)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  103,
                  111,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "Engine token vault"
          ],
          "writable": true
        },
        {
          "name": "traderTokenAccount",
          "docs": [
            "Trader's token ATA"
          ],
          "writable": true
        },
        {
          "name": "binArray",
          "docs": [
            "Active BinArray page (contains the current frontier bin).",
            "Loaded via manual bytemuck cast (no AccountLoader overhead)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tokenInput",
          "type": "u64"
        },
        {
          "name": "minGorOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unpausePool",
      "docs": [
        "Unpause trading — governance only."
      ],
      "discriminator": [
        241,
        148,
        129,
        243,
        222,
        125,
        125,
        160
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "updateFees",
      "docs": [
        "Update swap/creator/bin fee bps — governance only."
      ],
      "discriminator": [
        225,
        27,
        13,
        6,
        69,
        84,
        172,
        191
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "sovereign",
          "relations": [
            "enginePool"
          ]
        },
        {
          "name": "enginePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  103,
                  105,
                  110,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newSwapFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newCreatorFeeShareBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newBinFeeShareBps",
          "type": {
            "option": "u16"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "binArray",
      "discriminator": [
        92,
        142,
        92,
        220,
        5,
        148,
        70,
        181
      ]
    },
    {
      "name": "engineLpClaim",
      "discriminator": [
        192,
        153,
        152,
        113,
        30,
        59,
        15,
        117
      ]
    },
    {
      "name": "enginePool",
      "discriminator": [
        33,
        170,
        235,
        4,
        158,
        212,
        146,
        169
      ]
    }
  ],
  "events": [
    {
      "name": "binArrayClosed",
      "discriminator": [
        44,
        58,
        231,
        148,
        79,
        49,
        15,
        27
      ]
    },
    {
      "name": "binPageAllocated",
      "discriminator": [
        34,
        209,
        18,
        210,
        129,
        129,
        176,
        67
      ]
    },
    {
      "name": "creatorFeeClaimed",
      "discriminator": [
        54,
        120,
        193,
        26,
        161,
        47,
        187,
        207
      ]
    },
    {
      "name": "enginePoolClosed",
      "discriminator": [
        146,
        219,
        86,
        70,
        13,
        208,
        108,
        191
      ]
    },
    {
      "name": "lpFeeClaimed",
      "discriminator": [
        145,
        162,
        180,
        193,
        81,
        200,
        198,
        147
      ]
    },
    {
      "name": "poolCreated",
      "discriminator": [
        202,
        44,
        41,
        88,
        104,
        220,
        157,
        82
      ]
    },
    {
      "name": "poolDrained",
      "discriminator": [
        210,
        92,
        25,
        247,
        117,
        182,
        3,
        51
      ]
    },
    {
      "name": "poolStatusChanged",
      "discriminator": [
        148,
        190,
        81,
        62,
        81,
        239,
        137,
        188
      ]
    },
    {
      "name": "swap",
      "discriminator": [
        81,
        108,
        227,
        190,
        205,
        208,
        10,
        196
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "mathOverflow",
      "msg": "Math overflow in engine computation"
    },
    {
      "code": 6001,
      "name": "poolPaused",
      "msg": "Pool is paused"
    },
    {
      "code": 6002,
      "name": "poolNotTrading",
      "msg": "Pool is not in Trading status"
    },
    {
      "code": 6003,
      "name": "insufficientTokens",
      "msg": "Insufficient tokens in pool to fulfill buy"
    },
    {
      "code": 6004,
      "name": "insufficientReserves",
      "msg": "Insufficient GOR reserves to fulfill sell"
    },
    {
      "code": 6005,
      "name": "solvencyViolation",
      "msg": "Solvency violation: GOR reserve would drop below initial bonding principal"
    },
    {
      "code": 6006,
      "name": "zeroAmount",
      "msg": "Swap amount must be greater than zero"
    },
    {
      "code": 6007,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6008,
      "name": "swapFeeExceedsMax",
      "msg": "Swap fee exceeds maximum allowed (10%)"
    },
    {
      "code": 6009,
      "name": "creatorFeeShareExceedsMax",
      "msg": "Creator fee share exceeds maximum allowed (50%)"
    },
    {
      "code": 6010,
      "name": "noFeesToClaim",
      "msg": "No fees available to claim"
    },
    {
      "code": 6011,
      "name": "invalidBinConfig",
      "msg": "Invalid bin configuration"
    },
    {
      "code": 6012,
      "name": "zeroBondingAmount",
      "msg": "Bonding amount must be greater than zero"
    },
    {
      "code": 6013,
      "name": "zeroTokenSupply",
      "msg": "Token supply must be greater than zero"
    },
    {
      "code": 6014,
      "name": "recoveryNotComplete",
      "msg": "Recovery not yet complete — creator fees locked"
    },
    {
      "code": 6015,
      "name": "unauthorized",
      "msg": "Unauthorized: not the pool authority"
    },
    {
      "code": 6016,
      "name": "poolAlreadyDrained",
      "msg": "Pool has already been drained"
    },
    {
      "code": 6017,
      "name": "missingCreatorTokenAccount",
      "msg": "Creator token account required for buy-in"
    },
    {
      "code": 6018,
      "name": "binArrayMismatch",
      "msg": "BinArray does not belong to this pool's sovereign"
    },
    {
      "code": 6019,
      "name": "binPageNotLoaded",
      "msg": "Required BinArray page is not loaded in accounts"
    },
    {
      "code": 6020,
      "name": "binPageNotSequential",
      "msg": "BinArray page index is not sequential (gap in allocation)"
    },
    {
      "code": 6021,
      "name": "binCountOutOfRange",
      "msg": "Number of bins outside allowed range"
    },
    {
      "code": 6022,
      "name": "invalidFeeConfig",
      "msg": "Invalid fee configuration"
    },
    {
      "code": 6023,
      "name": "invalidBinArrayOwner",
      "msg": "BinArray account owner is not the engine program"
    },
    {
      "code": 6024,
      "name": "invalidBinArraySize",
      "msg": "BinArray account data length is incorrect"
    },
    {
      "code": 6025,
      "name": "invalidBinArray",
      "msg": "BinArray PDA does not match expected address or overflow page ordering is invalid"
    },
    {
      "code": 6026,
      "name": "invalidTaperConfig",
      "msg": "End ratio (p_end_bps) outside allowed range"
    },
    {
      "code": 6027,
      "name": "noReconciliationNeeded",
      "msg": "GOR reserve is already correct or higher — no reconciliation needed"
    },
    {
      "code": 6028,
      "name": "poolNotUnwound",
      "msg": "Pool must be in Unwound status to close accounts"
    }
  ],
  "types": [
    {
      "name": "bin",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokens",
            "docs": [
              "Tokens currently in this bin.",
              "Empty:   tokens == original_capacity (all tokens present)",
              "Partial: 0 < tokens < original_capacity (being filled)",
              "Filled:  tokens == 0 (all purchased, GOR locked)"
            ],
            "type": "u64"
          },
          {
            "name": "gorLocked",
            "docs": [
              "Actual GOR accumulated from CPAMM purchases.",
              "Empty:   0",
              "Partial: sum of GOR paid so far into this bin",
              "Filled:  total GOR locked (the settlement record)"
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "Bin status: 0=Empty, 1=Partial, 2=Filled"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Alignment padding"
            ],
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "feeSnapshotLo",
            "docs": [
              "Accumulator snapshot (lower 64 bits) — set when bin becomes Filled.",
              "Only earns fees after this point (prevents retroactive claims)."
            ],
            "type": "u64"
          },
          {
            "name": "feeSnapshotHi",
            "docs": [
              "Accumulator snapshot (upper 64 bits)"
            ],
            "type": "u64"
          },
          {
            "name": "feeCredit",
            "docs": [
              "Accumulated fee bonus GOR for this bin (settled lazily on sell).",
              "Boosts the sell rate: effective_rate = (gor_locked + fee_credit) / tokens_outstanding"
            ],
            "type": "u64"
          },
          {
            "name": "originalCapacity",
            "docs": [
              "This bin's token capacity when it was initialized.",
              "Computed via SLAMM taper: cap(i) = max(0, C0 - drop_bps × C0 × i / D)",
              "Each bin has a unique capacity; stored here for sell-side settlement."
            ],
            "type": "u64"
          },
          {
            "name": "reserved2",
            "docs": [
              "Extra padding so size_of::<Bin>() == 64 (matches Bin::LEN)"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "binArray",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereign",
            "docs": [
              "The sovereign this page belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "pageIndex",
            "docs": [
              "Page index (0-based). Global bin index = page_index * 128 + offset."
            ],
            "type": "u32"
          },
          {
            "name": "initializedBins",
            "docs": [
              "Number of bins initialized on this page (≤ BINS_PER_PAGE).",
              "Last page may have fewer than 128 active bins."
            ],
            "type": "u32"
          },
          {
            "name": "bins",
            "docs": [
              "The bin data"
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "bin"
                  }
                },
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "binArrayClosed",
      "docs": [
        "Emitted when a BinArray page is closed and rent reclaimed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "pageIndex",
            "type": "u32"
          },
          {
            "name": "rentRecovered",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "binPageAllocated",
      "docs": [
        "Emitted when a new BinArray page is allocated"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "pageIndex",
            "type": "u32"
          },
          {
            "name": "binsOnPage",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "createPoolParams",
      "docs": [
        "Parameters for pool creation"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "docs": [
              "Creator wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "totalTokenSupply",
            "docs": [
              "Total token supply deposited into the pool"
            ],
            "type": "u64"
          },
          {
            "name": "bondingGor",
            "docs": [
              "Total GOR from bonding (already in gor_vault)"
            ],
            "type": "u64"
          },
          {
            "name": "pEndBps",
            "docs": [
              "End ratio in basis points for SLAMM taper (e.g. 2000 = 20%)"
            ],
            "type": "u16"
          },
          {
            "name": "swapFeeBps",
            "docs": [
              "Swap fee in basis points"
            ],
            "type": "u16"
          },
          {
            "name": "creatorFeeShareBps",
            "docs": [
              "Creator fee share in bps (of total swap fees, after recovery)"
            ],
            "type": "u16"
          },
          {
            "name": "creatorEscrow",
            "docs": [
              "Creator's escrowed GOR for market buy-in (0 if none)"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "creatorFeeClaimed",
      "docs": [
        "Emitted when creator fees are claimed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalClaimed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "engineLpClaim",
      "docs": [
        "Tracks how much LP fee each depositor has already claimed.",
        "PDA seeds: [\"engine_lp_claim\", pool.key(), depositor.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "lastFeePerShare",
            "type": "u128"
          },
          {
            "name": "totalClaimed",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "enginePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolStatus",
            "docs": [
              "Current pool lifecycle status"
            ],
            "type": {
              "defined": {
                "name": "poolStatus"
              }
            }
          },
          {
            "name": "authority",
            "docs": [
              "Authority (sovereign PDA from main program)"
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "Creator wallet (for creator fee claims)"
            ],
            "type": "pubkey"
          },
          {
            "name": "sovereign",
            "docs": [
              "The sovereign this pool belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "The sovereign token mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "gorVault",
            "docs": [
              "System account PDA holding GOR reserves (native SOL)"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenVault",
            "docs": [
              "Token account holding unsold sovereign tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "totalTokenSupply",
            "docs": [
              "Total token supply deposited into pool at creation (immutable)"
            ],
            "type": "u64"
          },
          {
            "name": "tokenReserve",
            "docs": [
              "Tokens currently held in the pool (unsold / returned via sells)",
              "CPAMM spot_price = gor_reserve / token_reserve"
            ],
            "type": "u64"
          },
          {
            "name": "gorReserve",
            "docs": [
              "GOR backing the pool (trading reserve, EXCLUDES accumulated fees)",
              "Invariant: gor_reserve >= initial_gor_reserve (solvency floor)"
            ],
            "type": "u64"
          },
          {
            "name": "initialGorReserve",
            "docs": [
              "Initial GOR reserve from bonding (solvency floor, immutable)"
            ],
            "type": "u64"
          },
          {
            "name": "totalTokensSold",
            "docs": [
              "Total tokens currently sold (circulating outside pool)",
              "Invariant: total_tokens_sold + token_reserve == total_token_supply"
            ],
            "type": "u64"
          },
          {
            "name": "numBins",
            "docs": [
              "Total number of bins (core + extension). Set at init, immutable.",
              "All bins initialized with tapered capacity at page allocation."
            ],
            "type": "u32"
          },
          {
            "name": "binCapacity",
            "docs": [
              "Capacity of bin 0 (the largest bin). Derived at init from",
              "total_token_supply and p_end_bps. Used in compute_bin_capacity()."
            ],
            "type": "u64"
          },
          {
            "name": "activeBin",
            "docs": [
              "Global index of the current active (frontier) bin.",
              "Bins 0..active_bin-1 = Filled (GOR locked)",
              "Bin active_bin       = frontier (Empty or Partial)",
              "Bins active_bin+1..  = Empty (all tokens, untouched)"
            ],
            "type": "u32"
          },
          {
            "name": "highestAllocatedPage",
            "docs": [
              "Index of the highest allocated BinArray page.",
              "Pages 0..highest_allocated_page exist on-chain."
            ],
            "type": "u32"
          },
          {
            "name": "swapFeeBps",
            "docs": [
              "Swap fee in basis points (applied on every trade)"
            ],
            "type": "u16"
          },
          {
            "name": "creatorFeeShareBps",
            "docs": [
              "Creator's share of fees AFTER recovery, in bps of total fees"
            ],
            "type": "u16"
          },
          {
            "name": "recoveryTarget",
            "docs": [
              "Target GOR for investors to recover (= initial_gor_reserve)"
            ],
            "type": "u64"
          },
          {
            "name": "totalRecovered",
            "docs": [
              "Total LP fees distributed toward recovery"
            ],
            "type": "u64"
          },
          {
            "name": "recoveryComplete",
            "docs": [
              "Whether recovery is complete (enables creator fee share)"
            ],
            "type": "bool"
          },
          {
            "name": "totalFeesCollected",
            "docs": [
              "Lifetime total fees collected (GOR)"
            ],
            "type": "u64"
          },
          {
            "name": "lpFeesAccumulated",
            "docs": [
              "LP fees accumulated (claimable by investors)"
            ],
            "type": "u64"
          },
          {
            "name": "creatorFeesAccumulated",
            "docs": [
              "Creator fees accumulated (claimable after recovery)"
            ],
            "type": "u64"
          },
          {
            "name": "lpFeesClaimed",
            "docs": [
              "Total LP fees claimed by investors"
            ],
            "type": "u64"
          },
          {
            "name": "creatorFeesClaimed",
            "docs": [
              "Total creator fees claimed"
            ],
            "type": "u64"
          },
          {
            "name": "lpFeePerShare",
            "docs": [
              "Per-share fee accumulator (scaled by FEE_PRECISION 1e12)"
            ],
            "type": "u128"
          },
          {
            "name": "lastPrice",
            "docs": [
              "Last trade execution price (precision-scaled)"
            ],
            "type": "u64"
          },
          {
            "name": "twapAccumulator",
            "docs": [
              "Time-weighted price accumulator"
            ],
            "type": "u128"
          },
          {
            "name": "twapLastSlot",
            "docs": [
              "Slot of last TWAP update"
            ],
            "type": "u64"
          },
          {
            "name": "totalVolumeBuy",
            "docs": [
              "Lifetime buy volume in GOR"
            ],
            "type": "u128"
          },
          {
            "name": "totalVolumeSell",
            "docs": [
              "Lifetime sell volume in GOR"
            ],
            "type": "u128"
          },
          {
            "name": "totalTrades",
            "docs": [
              "Total trade count"
            ],
            "type": "u64"
          },
          {
            "name": "totalEligibleWeight",
            "docs": [
              "Sum of gor_locked for all currently-Filled bins (eligible weight)"
            ],
            "type": "u64"
          },
          {
            "name": "binFeeAccumulator",
            "docs": [
              "Global fee-per-weight accumulator (scaled by FEE_PRECISION 1e12).",
              "Updated: A += ΔF × FEE_PRECISION / W  on every fee deposit."
            ],
            "type": "u128"
          },
          {
            "name": "binFeeShareBps",
            "docs": [
              "Percentage of swap fees routed to bin rewards (bps, e.g. 3000 = 30%)"
            ],
            "type": "u16"
          },
          {
            "name": "totalBinFeesDistributed",
            "docs": [
              "Lifetime bin fee GOR distributed (accounting)"
            ],
            "type": "u64"
          },
          {
            "name": "isPaused",
            "docs": [
              "Emergency pause flag"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "coreBins",
            "docs": [
              "Number of core (taper) bins. Always CORE_BINS (5000)."
            ],
            "type": "u32"
          },
          {
            "name": "pEndBps",
            "docs": [
              "End ratio in basis points: bin N-1 capacity as % of bin 0.",
              "e.g. 2000 = bin 4999 has 20% of bin 0's capacity."
            ],
            "type": "u16"
          },
          {
            "name": "extBins",
            "docs": [
              "Number of extension bins beyond core (continue taper to zero).",
              "Derived: ceil(p_end_bps × (core_bins - 1) / (10000 - p_end_bps))."
            ],
            "type": "u32"
          },
          {
            "name": "pendingBinFees",
            "docs": [
              "Bin fees buffered when total_eligible_weight == 0.",
              "Flushed into the accumulator on the next swap where weight > 0."
            ],
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          }
        ]
      }
    },
    {
      "name": "enginePoolClosed",
      "docs": [
        "Emitted when the EnginePool account is closed and rent reclaimed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "rentRecovered",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "pagesHint",
            "docs": [
              "Hint: number of pages that should have been closed first"
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "lpFeeClaimed",
      "docs": [
        "Emitted when LP fees are claimed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "feePerShare",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "poolCreated",
      "docs": [
        "Emitted when a pool is created"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereign",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "initialGorReserve",
            "type": "u64"
          },
          {
            "name": "totalTokenSupply",
            "type": "u64"
          },
          {
            "name": "coreBins",
            "type": "u32"
          },
          {
            "name": "extBins",
            "type": "u32"
          },
          {
            "name": "totalBins",
            "type": "u32"
          },
          {
            "name": "c0",
            "type": "u64"
          },
          {
            "name": "pEndBps",
            "type": "u16"
          },
          {
            "name": "swapFeeBps",
            "type": "u16"
          },
          {
            "name": "creatorFeeShareBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "poolDrained",
      "docs": [
        "Emitted when pool is drained (unwind)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "gorDrained",
            "type": "u64"
          },
          {
            "name": "tokensDrained",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "poolStatus",
      "docs": [
        "Lifecycle status of an engine pool."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "uninitialized"
          },
          {
            "name": "trading"
          },
          {
            "name": "paused"
          },
          {
            "name": "unwound"
          }
        ]
      }
    },
    {
      "name": "poolStatusChanged",
      "docs": [
        "Emitted when pool status changes"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "oldStatus",
            "type": "u8"
          },
          {
            "name": "newStatus",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "swap",
      "docs": [
        "Emitted on every swap (buy or sell)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "gorAmount",
            "type": "u64"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "executionPrice",
            "type": "u64"
          },
          {
            "name": "gorReserve",
            "type": "u64"
          },
          {
            "name": "tokenReserve",
            "type": "u64"
          },
          {
            "name": "activeBin",
            "type": "u32"
          },
          {
            "name": "isPartial",
            "docs": [
              "True when the swap was a partial fill (refund > 0)"
            ],
            "type": "bool"
          }
        ]
      }
    }
  ]
};
