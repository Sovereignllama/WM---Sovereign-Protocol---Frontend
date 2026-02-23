/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sovereign_liquidity.json`.
 */
export type SovereignLiquidity = {
  "address": "2LPPAG7UhVop1RiRBh8oZtjzMoJ9St9WV4nY7JwmoNbA",
  "metadata": {
    "name": "sovereignLiquidity",
    "version": "1.0.0-beta.1",
    "spec": "0.1.0",
    "description": "Sovereign Liquidity Protocol - Fair launch with recovery-first LP and Genesis NFT fee rights"
  },
  "instructions": [
    {
      "name": "acceptAuthorityTransfer",
      "docs": [
        "Accept protocol authority transfer (step 2 of 2)"
      ],
      "discriminator": [
        239,
        248,
        177,
        2,
        206,
        97,
        46,
        255
      ],
      "accounts": [
        {
          "name": "newAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "adminSweepVault",
      "docs": [
        "Admin sweep — transfer remaining sol_vault balance to treasury.",
        "Use after all investor/creator obligations are cleared.",
        "Protocol authority only. Sovereign must be Halted, Unwound, or Retired."
      ],
      "discriminator": [
        55,
        167,
        169,
        85,
        135,
        189,
        215,
        84
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "treasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "buyNft",
      "docs": [
        "Buy a listed Genesis NFT. Enforces royalty payment to protocol wallet.",
        "Atomically: pay SOL → thaw → transfer → re-freeze → update ownership."
      ],
      "discriminator": [
        96,
        0,
        28,
        190,
        49,
        107,
        83,
        222
      ],
      "accounts": [
        {
          "name": "buyer",
          "docs": [
            "Buyer paying for the NFT"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "royaltyWallet",
          "writable": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "The NFT being bought"
          ]
        },
        {
          "name": "sellerNftTokenAccount",
          "docs": [
            "Seller's NFT token account (holds the NFT, currently frozen)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buyerNftTokenAccount",
          "docs": [
            "Buyer's NFT token account (will receive the NFT)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "sellerDepositRecord",
          "docs": [
            "Seller's deposit record — closed after data is copied to buyer's new record.",
            "Rent refunded to seller."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          }
        },
        {
          "name": "buyerDepositRecord",
          "docs": [
            "Buyer's new deposit record — init'd with buyer's key in PDA seed.",
            "All position data copied from seller's record.",
            "NOTE: Fails if buyer already has a deposit record for this sovereign",
            "(one position per wallet per sovereign). Use a different wallet."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "nftListing",
          "docs": [
            "The listing being purchased — closed after sale (rent → seller)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  102,
                  116,
                  95,
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimCreatorUnwind",
      "docs": [
        "Creator reclaims tokens and surplus GOR after unwind.",
        "BYO: returns all tokens + surplus GOR above investor principal.",
        "TokenLaunch: returns unsold tokens (surplus goes to token holders instead)."
      ],
      "discriminator": [
        110,
        150,
        147,
        57,
        37,
        90,
        54,
        185
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "sovereign"
          ]
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "docs": [
            "Source of surplus GOR returned to creator after governance unwind.",
            "Funds flow only to `creator` (validated by has_one on sovereign) — no arbitrary withdrawal."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenVault",
          "docs": [
            "Token vault — holds unsold/returned tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "tokenMint",
          "docs": [
            "Token mint — for transfer_checked"
          ]
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "Creator's token account — receives returned tokens"
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
      "name": "claimPoolLpFees",
      "docs": [
        "Claim LP fees (NFT holder). Verifies NFT, then CPIs to engine program."
      ],
      "discriminator": [
        2,
        71,
        114,
        148,
        196,
        222,
        169,
        161
      ],
      "accounts": [
        {
          "name": "holder",
          "docs": [
            "Current NFT holder (bearer of the Genesis NFT position)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "originalDepositor"
        },
        {
          "name": "depositRecord",
          "docs": [
            "The investor's deposit record (proves a valid deposit position)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "originalDepositor"
              }
            ]
          }
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "Genesis NFT token account — proves the holder possesses the position NFT."
          ]
        },
        {
          "name": "enginePool",
          "docs": [
            "Engine pool (owned by engine program)"
          ],
          "writable": true
        },
        {
          "name": "lpClaim",
          "docs": [
            "LP claim record (owned by engine program, init_if_needed)"
          ],
          "writable": true
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine pool GOR vault"
          ],
          "writable": true
        },
        {
          "name": "engineProgram",
          "docs": [
            "The sovereign-engine program"
          ],
          "address": "Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt"
        },
        {
          "name": "protocolState",
          "docs": [
            "Protocol state — needed to read default_swap_fee_bps if transition fires"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
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
      "name": "claimTransferFees",
      "docs": [
        "Creator claims accumulated transfer fee tokens from the vault.",
        "Optionally harvests withheld fees from remaining_accounts first.",
        "No cap, no state gate — creator can claim anytime."
      ],
      "discriminator": [
        255,
        50,
        252,
        109,
        231,
        252,
        248,
        71
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "Token mint — needed for decimals + harvest"
          ],
          "writable": true
        },
        {
          "name": "tokenVault",
          "docs": [
            "Token vault — source of accumulated transfer fee tokens.",
            "Authority = sovereign PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "creatorTokenAccount",
          "docs": [
            "Creator's token account — destination for claimed tokens"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram2022",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "claimUnwind",
      "docs": [
        "Claim proceeds from unwound sovereign"
      ],
      "discriminator": [
        196,
        153,
        9,
        184,
        35,
        38,
        200,
        17
      ],
      "accounts": [
        {
          "name": "holder",
          "docs": [
            "Current NFT holder (bearer of the position)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "originalDepositor"
        },
        {
          "name": "depositRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "originalDepositor"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "Genesis NFT mint — will be burned (Token-2022)"
          ],
          "writable": true
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "Genesis NFT token account — must hold exactly 1, will be burned (Token-2022)"
          ],
          "writable": true
        },
        {
          "name": "solVault",
          "docs": [
            "Holds investor deposits returned by drain_pool. Funds flow only to `holder`",
            "after NFT burn under Unwound state guard — no arbitrary withdrawal possible."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
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
      "name": "closeSovereign",
      "docs": [
        "Close a sovereign and all its vaults permanently.",
        "Sweeps remaining SOL to treasury, burns tokens, recovers rent.",
        "Works with old/outdated account layouts (raw byte parsing).",
        "Protocol authority only. Sovereign must be Retired."
      ],
      "discriminator": [
        227,
        250,
        87,
        86,
        158,
        17,
        11,
        84
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "docs": [
            "Cannot use Account<> because old ProtocolState may be undersized."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "docs": [
            "because old sovereign accounts may not match current struct layout."
          ],
          "writable": true
        },
        {
          "name": "solVault",
          "writable": true
        },
        {
          "name": "tokenVault",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "treasury",
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
      "name": "closeVoteRecord",
      "docs": [
        "Close a finalized VoteRecord account and return rent to the original voter.",
        "Protocol authority only. Proposal must be in Passed or Failed state."
      ],
      "discriminator": [
        41,
        137,
        198,
        76,
        80,
        223,
        157,
        10
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "proposal.sovereign",
                "account": "proposal"
              },
              {
                "kind": "account",
                "path": "proposal.proposal_id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "voter",
          "writable": true
        },
        {
          "name": "voteRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "proposal"
              },
              {
                "kind": "account",
                "path": "vote_record.genesis_nft_mint",
                "account": "voteRecord"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createSovereign",
      "docs": [
        "Create a new sovereign (token launch or BYO token)"
      ],
      "discriminator": [
        173,
        247,
        75,
        229,
        177,
        225,
        13,
        222
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "docs": [
            "Use Box to reduce stack usage - ProtocolState is a large account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "docs": [
            "Sovereign PDA — seeded with `sovereign_count + 1` to match the ID assigned",
            "in the handler after incrementing. This is safe because Solana executes",
            "transactions sequentially within a slot: the PDA init and the count increment",
            "are atomic within this single transaction."
          ],
          "writable": true
        },
        {
          "name": "creatorTracker",
          "docs": [
            "Use Box to reduce stack usage"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  97,
                  116,
                  111,
                  114,
                  95,
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
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
          "name": "treasury",
          "docs": [
            "Validated against the hardcoded TREASURY constant."
          ],
          "writable": true
        },
        {
          "name": "tokenMint",
          "docs": [
            "Token mint - for BYO this is the existing token (SPL Token or Token-2022)",
            "For TokenLaunch this will be created in a separate instruction"
          ],
          "optional": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "Creator's token account (for BYO token transfer)"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenVault",
          "docs": [
            "Sovereign's token vault"
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "tokenProgram",
          "docs": [
            "Token program - SPL Token or Token-2022 (for BYO compatibility)"
          ]
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
              "name": "createSovereignParams"
            }
          }
        }
      ]
    },
    {
      "name": "createToken",
      "docs": [
        "Create Token-2022 mint for a TokenLaunch sovereign",
        "Must be called after create_sovereign for TokenLaunch types"
      ],
      "discriminator": [
        84,
        52,
        204,
        228,
        24,
        140,
        234,
        75
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "Token mint PDA - derived from sovereign"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
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
          "name": "tokenVault",
          "docs": [
            "Token vault to hold initial supply - created manually after mint init"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "tokenProgram2022",
          "docs": [
            "Token-2022 program"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createTokenParams"
            }
          }
        }
      ]
    },
    {
      "name": "delistNft",
      "docs": [
        "Remove an NFT listing. Callable by seller or protocol authority."
      ],
      "discriminator": [
        91,
        249,
        165,
        185,
        22,
        7,
        119,
        176
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Caller — seller or protocol authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          },
          "relations": [
            "nftListing"
          ]
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "nftMint",
          "docs": [
            "The NFT mint (for PDA derivation)"
          ]
        },
        {
          "name": "nftListing",
          "docs": [
            "The listing being removed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  102,
                  116,
                  95,
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
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
      "name": "deposit",
      "docs": [
        "Deposit SOL during bonding phase"
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "depositRecord",
          "docs": [
            "Deposit record - initialized if new depositor"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "docs": [
            "SOL vault to hold deposits during bonding"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergencyDrainEngine",
      "docs": [
        "Emergency drain engine pool — CPIs to engine drain_pool from Halted state.",
        "Protocol authority only. Use for Recovery/Active sovereigns where GOR is in engine vaults."
      ],
      "discriminator": [
        209,
        249,
        148,
        100,
        112,
        208,
        221,
        47
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "enginePool",
          "docs": [
            "Engine pool (owned by engine program)"
          ],
          "writable": true
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine pool GOR vault"
          ],
          "writable": true
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "Engine pool token vault"
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
          "name": "solVault",
          "docs": [
            "Sovereign's SOL vault (receives drained GOR)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenVault",
          "docs": [
            "Sovereign's token vault (receives unsold tokens)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "engineProgram",
          "docs": [
            "The sovereign-engine-v3 program"
          ],
          "address": "Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt"
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
      "name": "emergencyTokenRedemption",
      "docs": [
        "Emergency token redemption - external token holders burn sovereign tokens",
        "to receive proportional share of surplus GOR from the LP unwind.",
        "Available when token_redemption_pool > 0 (unwind_sol_balance > total_deposited)."
      ],
      "discriminator": [
        121,
        166,
        182,
        60,
        214,
        200,
        59,
        108
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenMint",
          "docs": [
            "Token mint — needed for transfer_checked (reads decimals)"
          ],
          "writable": true
        },
        {
          "name": "callerTokenAccount",
          "docs": [
            "Caller's token account — tokens will be transferred to creator"
          ],
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "Creator's token account — receives the redeemed tokens instead of burning"
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
      "name": "emergencyUnlock",
      "docs": [
        "Emergency unlock - transitions sovereign to Halted state",
        "Callable by protocol authority or sovereign creator from ANY state"
      ],
      "discriminator": [
        17,
        106,
        80,
        63,
        244,
        220,
        225,
        70
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "emergencyWithdraw",
      "docs": [
        "Emergency withdraw for investors - reclaim deposited GOR",
        "If Genesis NFT was minted, pass nft_mint and nft_token_account as remaining_accounts"
      ],
      "discriminator": [
        239,
        45,
        203,
        64,
        150,
        73,
        218,
        92
      ],
      "accounts": [
        {
          "name": "holder",
          "docs": [
            "Current NFT holder (or original depositor if pre-finalization)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "originalDepositor",
          "docs": [
            "For pre-finalization (no NFT), this must equal `holder`."
          ]
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "depositRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "originalDepositor"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenProgram",
          "docs": [
            "SPL Token program — needed if burning Genesis NFT"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "emergencyWithdrawCreator",
      "docs": [
        "Emergency withdraw for creator - reclaim escrow and creation fee"
      ],
      "discriminator": [
        24,
        35,
        211,
        124,
        4,
        217,
        7,
        12
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "tokenMint",
          "docs": [
            "Must be writable. Address validated in handler."
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program — must be SPL Token or Token-2022"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "burnTokens",
          "type": "bool"
        }
      ]
    },
    {
      "name": "executeEngineUnwind",
      "docs": [
        "Execute engine pool unwind — drain pool vaults via CPI, take protocol fee.",
        "Called after governance unwind vote passes and observation period elapses."
      ],
      "discriminator": [
        120,
        60,
        153,
        185,
        186,
        195,
        203,
        46
      ],
      "accounts": [
        {
          "name": "executor",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "enginePool",
          "docs": [
            "Engine pool (owned by engine program, read for volume check)"
          ],
          "writable": true
        },
        {
          "name": "engineGorVault",
          "docs": [
            "Engine pool GOR vault"
          ],
          "writable": true
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "Engine pool token vault"
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
          "name": "solVault",
          "docs": [
            "Sovereign's SOL vault (receives drained GOR for investor claims)",
            "Receives GOR drained from the engine pool. Funds flow only to NFT holders",
            "via claim_unwind after protocol fee deduction — no arbitrary withdrawal possible."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenVault",
          "docs": [
            "Sovereign's token vault (receives unsold tokens)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "engineProgram",
          "docs": [
            "The sovereign-engine-v3 program"
          ],
          "address": "Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt"
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
      "name": "finalizeEnginePool",
      "docs": [
        "Finalize sovereign: Create engine pool via CPI to sovereign-engine program.",
        "Called after bond target is met (state = Finalizing).",
        "Transfers GOR + tokens to engine vaults, creates pool, optional creator buy-in."
      ],
      "discriminator": [
        86,
        40,
        38,
        187,
        85,
        110,
        17,
        29
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "The sovereign's token mint (mut: set_transfer_fee writes to mint)"
          ],
          "writable": true
        },
        {
          "name": "solVault",
          "docs": [
            "The bonding SOL vault (holds deposited GOR from investors)",
            "Holds investor deposits. Funds are transferred to the engine GOR vault in Step 1",
            "of finalize_engine_pool — only to the canonical engine_gor_vault PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenVault",
          "docs": [
            "The token vault (holds sovereign tokens deposited by creator)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "engineGorVault",
          "docs": [
            "The engine pool's GOR vault (native SOL PDA — derived under engine program)"
          ],
          "writable": true
        },
        {
          "name": "enginePool",
          "docs": [
            "The engine pool account (will be initialized by engine program via CPI)"
          ],
          "writable": true
        },
        {
          "name": "engineTokenVault",
          "docs": [
            "The engine pool's token vault (will be initialized by engine program via CPI)"
          ],
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "Optional: Creator's token ATA (receives tokens from creator buy-in).",
            "Only used if sovereign.creator_escrow > 0."
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "binArray",
          "docs": [
            "BinArray page 0 (will be initialized by engine program via CPI)"
          ],
          "writable": true
        },
        {
          "name": "engineProgram",
          "docs": [
            "The sovereign-engine-v3 program"
          ],
          "address": "Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt"
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
      "name": "finalizeVote",
      "docs": [
        "Finalize voting after period ends.",
        "If passed, snapshots engine pool fee counters and starts observation period.",
        "remaining_accounts[0] = engine_pool (required when vote passes, for fee snapshot)"
      ],
      "discriminator": [
        181,
        176,
        6,
        248,
        249,
        134,
        146,
        56
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "proposal.proposal_id",
                "account": "proposal"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "forceCloseProposal",
      "docs": [
        "Force-close a broken or stuck proposal account.",
        "Clears the sovereign's has_active_proposal flag and returns rent.",
        "Protocol authority only."
      ],
      "discriminator": [
        122,
        93,
        90,
        74,
        251,
        118,
        127,
        95
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "sovereignId"
              }
            ]
          }
        },
        {
          "name": "proposal",
          "docs": [
            "Proposal layout changed (e.g. old account missing voting_starts_at).",
            "Rent is returned to the authority."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "arg",
                "path": "proposalId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "sovereignId",
          "type": "u64"
        },
        {
          "name": "proposalId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "forceCloseVoteRecord",
      "docs": [
        "Force-close a VoteRecord regardless of proposal status.",
        "Used to clean up orphaned vote records after force_close_proposal.",
        "Rent returned to original voter. Protocol authority only."
      ],
      "discriminator": [
        18,
        75,
        56,
        115,
        103,
        1,
        76,
        1
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "docs": [
            "The proposal this vote record belongs to.",
            "Can be in any state (Active, Passed, Failed, etc.)",
            "Validated as a program-owned account via constraint."
          ]
        },
        {
          "name": "voter",
          "writable": true
        },
        {
          "name": "voteRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "proposal"
              },
              {
                "kind": "account",
                "path": "vote_record.genesis_nft_mint",
                "account": "voteRecord"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "freezeGenesisNft",
      "docs": [
        "Admin freeze — retroactively freeze an already-minted Genesis NFT.",
        "Use for NFTs minted before freeze-at-mint was added."
      ],
      "discriminator": [
        164,
        254,
        188,
        57,
        30,
        21,
        118,
        163
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Protocol authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "The NFT mint to freeze"
          ]
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "The holder's token account (must hold the NFT)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "holder"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "holder"
        },
        {
          "name": "depositRecord",
          "docs": [
            "Deposit record — validates this NFT belongs to this sovereign"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initializeCollection",
      "docs": [
        "Initialize the protocol-wide Genesis NFT collection.",
        "One-time setup — creates a Metaplex verified collection mint",
        "so all Genesis NFTs are grouped on marketplaces."
      ],
      "discriminator": [
        112,
        62,
        53,
        139,
        173,
        152,
        98,
        93
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "protocolState"
          ]
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collectionMint",
          "docs": [
            "Collection NFT mint — one per protocol, PDA-derived."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  101,
                  110,
                  101,
                  115,
                  105,
                  115,
                  95,
                  99,
                  111,
                  108,
                  108,
                  101,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "collectionTokenAccount",
          "docs": [
            "Token account to hold the single collection NFT."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "protocolState"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "collectionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collectionMetadata",
          "writable": true
        },
        {
          "name": "collectionMasterEdition",
          "writable": true
        },
        {
          "name": "metadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeProtocol",
      "docs": [
        "Initialize the protocol state (one-time setup)"
      ],
      "discriminator": [
        188,
        233,
        252,
        106,
        134,
        146,
        202,
        91
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "treasury"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "listNft",
      "docs": [
        "List a Genesis NFT for sale on the protocol marketplace.",
        "NFT stays frozen in seller's wallet. Price in SOL (lamports)."
      ],
      "discriminator": [
        88,
        221,
        93,
        166,
        63,
        220,
        106,
        232
      ],
      "accounts": [
        {
          "name": "seller",
          "docs": [
            "NFT holder listing the NFT"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "The NFT mint being listed"
          ]
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "Seller's NFT token account — must hold 1 NFT (mut for thaw/approve/freeze)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "depositRecord",
          "docs": [
            "Deposit record — proves seller owns this position"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "seller"
              }
            ]
          }
        },
        {
          "name": "nftListing",
          "docs": [
            "NftListing PDA — created here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  102,
                  116,
                  95,
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
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
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "markBondingFailed",
      "docs": [
        "Mark bonding as failed if deadline passed"
      ],
      "discriminator": [
        90,
        22,
        152,
        88,
        54,
        82,
        80,
        230
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "mintGenesisNft",
      "docs": [
        "Mint Genesis NFT to a depositor after finalization"
      ],
      "discriminator": [
        188,
        218,
        134,
        12,
        220,
        55,
        97,
        254
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "depositRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "depositor",
          "docs": [
            "Depositor who will receive the NFT — must sign to prevent front-running / NFT theft"
          ],
          "signer": true
        },
        {
          "name": "nftMint",
          "docs": [
            "Genesis NFT mint for this specific depositor (Token-2022 for extension support)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  101,
                  110,
                  101,
                  115,
                  105,
                  115,
                  95,
                  110,
                  102,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "NFT token account for the depositor (Token-2022)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "depositor"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "metadataAccount",
          "writable": true
        },
        {
          "name": "protocolState",
          "docs": [
            "Protocol state — signs the VerifyCollection CPI as collection authority"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collectionMint",
          "docs": [
            "Collection mint PDA"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  101,
                  110,
                  101,
                  115,
                  105,
                  115,
                  95,
                  99,
                  111,
                  108,
                  108,
                  101,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "collectionMetadata",
          "writable": true
        },
        {
          "name": "collectionMasterEdition",
          "docs": [
            "Must be writable: VerifyCollection CPI updates supply tracking on the master edition."
          ],
          "writable": true
        },
        {
          "name": "metadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "proposeAuthorityTransfer",
      "docs": [
        "Propose protocol authority transfer (step 1 of 2)"
      ],
      "discriminator": [
        57,
        206,
        225,
        129,
        35,
        111,
        174,
        145
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "newAuthority"
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "proposeUnwind",
      "docs": [
        "Propose to unwind the sovereign (Genesis NFT holders)"
      ],
      "discriminator": [
        72,
        168,
        80,
        19,
        92,
        71,
        236,
        127
      ],
      "accounts": [
        {
          "name": "holder",
          "docs": [
            "Current NFT holder (bearer of the position)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "originalDepositor"
        },
        {
          "name": "depositRecord",
          "docs": [
            "Deposit record — proves a valid deposit position exists"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "originalDepositor"
              }
            ]
          }
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "Genesis NFT token account — proves the holder possesses the position NFT"
          ]
        },
        {
          "name": "proposal",
          "docs": [
            "Proposal account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "sovereign.proposal_count",
                "account": "sovereignState"
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
      "name": "reallocProtocolState",
      "docs": [
        "Realloc ProtocolState account to current layout size.",
        "One-time migration after program upgrade adds new fields.",
        "Protocol authority only."
      ],
      "discriminator": [
        119,
        123,
        144,
        129,
        40,
        39,
        79,
        47
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "docs": [
            "buffer may be too small for the current ProtocolState layout."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
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
      "name": "redeemTokensForGor",
      "docs": [
        "Token holders burn sovereign tokens for proportional surplus GOR.",
        "Only available after governance unwind (Unwound state), within 30-day window."
      ],
      "discriminator": [
        196,
        246,
        215,
        13,
        59,
        245,
        34,
        166
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "docs": [
            "Source of GOR payout to token holders redeeming against the token_redemption_pool.",
            "Funds flow only to `caller` after verified token transfer — no arbitrary withdrawal possible."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "tokenMint",
          "docs": [
            "Token mint — needed for transfer_checked (reads decimals)"
          ],
          "writable": true
        },
        {
          "name": "callerTokenAccount",
          "docs": [
            "Caller's token account — tokens will be transferred from here to creator"
          ],
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "Creator's token account — receives the redeemed tokens instead of burning"
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
      "name": "renounceSellFee",
      "docs": [
        "Permanently renounce sell fee control (sets to 0%, irreversible)",
        "Only after recovery is complete (or anytime for FairLaunch mode)"
      ],
      "discriminator": [
        196,
        209,
        97,
        46,
        238,
        214,
        68,
        78
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "The token mint with TransferFeeConfig"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram2022",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "retireSovereign",
      "docs": [
        "Retire a sovereign after its 30-day claim window expires.",
        "Permissionless crank — anyone can call.",
        "Sovereign must be Failed, Halted, or Unwound with unwound_at + 30 days elapsed."
      ],
      "discriminator": [
        130,
        38,
        240,
        45,
        78,
        77,
        178,
        199
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can crank this — no authority check needed."
          ],
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "setNftRoyaltyConfig",
      "docs": [
        "Set protocol-wide NFT royalty percentage and receiving wallet.",
        "Protocol authority only. Applies to all current and future NFT sales."
      ],
      "discriminator": [
        127,
        89,
        95,
        8,
        145,
        164,
        18,
        64
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newRoyaltyBps",
          "type": "u16"
        },
        {
          "name": "newRoyaltyWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setProtocolPaused",
      "docs": [
        "Pause/unpause protocol (emergency)"
      ],
      "discriminator": [
        47,
        62,
        75,
        69,
        166,
        0,
        147,
        157
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setUnwindBalance",
      "docs": [
        "Set unwind_sol_balance from sol_vault balance (migration helper).",
        "Protocol authority only. Sovereign must be Halted.",
        "Enables emergency_withdraw to calculate proportional shares."
      ],
      "discriminator": [
        107,
        14,
        236,
        186,
        119,
        221,
        55,
        136
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "docs": [
            "Sovereign's SOL vault — read balance to set unwind_sol_balance"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
      "name": "sweepRedemptionPool",
      "docs": [
        "Sweep unclaimed redemption pool GOR to treasury after 30-day window expires.",
        "Only callable by protocol authority."
      ],
      "discriminator": [
        9,
        183,
        198,
        231,
        38,
        115,
        38,
        228
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
          "name": "treasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "syncEngineState",
      "discriminator": [
        8,
        187,
        225,
        151,
        102,
        34,
        14,
        202
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "enginePool",
          "docs": [
            "Engine pool account (owned by engine program, writable for fee-snap CPI)"
          ],
          "writable": true
        },
        {
          "name": "protocolState",
          "docs": [
            "Protocol state — needed to read default_swap_fee_bps on transition"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "engineProgram",
          "docs": [
            "The sovereign-engine-v3 program (needed for fee-snap CPI)"
          ],
          "address": "Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt"
        }
      ],
      "args": []
    },
    {
      "name": "transferNft",
      "docs": [
        "Transfer a Genesis NFT to another wallet (free, no royalty).",
        "Goes through the program to thaw → transfer → re-freeze.",
        "NFT must NOT be listed (delist first)."
      ],
      "discriminator": [
        190,
        28,
        194,
        8,
        194,
        218,
        78,
        78
      ],
      "accounts": [
        {
          "name": "sender",
          "docs": [
            "Current NFT holder initiating the transfer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "The NFT mint being transferred"
          ]
        },
        {
          "name": "senderNftTokenAccount",
          "docs": [
            "Sender's NFT token account (holds the NFT, frozen)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientNftTokenAccount",
          "docs": [
            "Recipient's NFT token account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "senderDepositRecord",
          "docs": [
            "Sender's deposit record — closed after data is copied to recipient's new record."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "recipientDepositRecord",
          "docs": [
            "Recipient's new deposit record — init'd with recipient's key in PDA seed.",
            "NOTE: Fails if recipient already has a deposit record for this sovereign."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateEngineFees",
      "docs": [
        "Update engine pool fee parameters (swap fee, creator share, bin fee share).",
        "CPIs to sovereign_engine_v3::update_fees, sovereign PDA signs.",
        "Protocol authority only (governance-gated)."
      ],
      "discriminator": [
        85,
        144,
        7,
        246,
        64,
        172,
        67,
        16
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Protocol authority — only admin can adjust engine fees"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "enginePool",
          "docs": [
            "Engine pool (owned by engine program)"
          ],
          "writable": true
        },
        {
          "name": "engineProgram",
          "docs": [
            "The sovereign-engine-v3 program"
          ],
          "address": "Sov7HzpTsU3GttXmHBzjRhrjrCQ5RPYhkMns6zNUNtt"
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
    },
    {
      "name": "updateProtocolFees",
      "docs": [
        "Update protocol fee parameters"
      ],
      "discriminator": [
        158,
        219,
        253,
        143,
        54,
        45,
        113,
        182
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newCreationFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newMinFeeLamports",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newMinDeposit",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newMinBondTarget",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newUnwindFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newVolumeThresholdBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newVotingPeriod",
          "type": {
            "option": "i64"
          }
        },
        {
          "name": "newObservationPeriod",
          "type": {
            "option": "i64"
          }
        },
        {
          "name": "newGovernanceQuorumBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newGovernancePassThresholdBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newDefaultSwapFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newByoMinSupplyBps",
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
          "name": "newDiscussionPeriod",
          "type": {
            "option": "i64"
          }
        }
      ]
    },
    {
      "name": "updateSellFee",
      "docs": [
        "Lower the sell fee (can only decrease, never increase)"
      ],
      "discriminator": [
        144,
        230,
        98,
        228,
        61,
        234,
        210,
        24
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "The token mint with TransferFeeConfig"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram2022",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "newFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "vote",
      "docs": [
        "Vote on an unwind proposal"
      ],
      "discriminator": [
        227,
        110,
        155,
        23,
        136,
        126,
        172,
        25
      ],
      "accounts": [
        {
          "name": "holder",
          "docs": [
            "Current NFT holder (bearer of the position)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "originalDepositor"
        },
        {
          "name": "depositRecord",
          "docs": [
            "Voter's deposit record with NFT"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "originalDepositor"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "Genesis NFT mint — used for VoteRecord PDA derivation (one vote per NFT position)"
          ]
        },
        {
          "name": "nftTokenAccount",
          "docs": [
            "Genesis NFT token account — proves the holder possesses the position NFT"
          ]
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "proposal.proposal_id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "voteRecord",
          "docs": [
            "Vote record — keyed by NFT mint to prevent double-voting after NFT transfer"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "proposal"
              },
              {
                "kind": "account",
                "path": "nftMint"
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
          "name": "support",
          "type": "bool"
        }
      ]
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw SOL during bonding phase (investors only)"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "depositRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawCreatorFailed",
      "docs": [
        "Creator withdraws escrow from failed bonding"
      ],
      "discriminator": [
        177,
        175,
        108,
        205,
        111,
        166,
        48,
        132
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
      "name": "withdrawFailed",
      "docs": [
        "Investor withdraws from failed bonding"
      ],
      "discriminator": [
        235,
        53,
        122,
        63,
        87,
        220,
        130,
        215
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "sovereign",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  118,
                  101,
                  114,
                  101,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sovereign.sovereign_id",
                "account": "sovereignState"
              }
            ]
          }
        },
        {
          "name": "depositRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "sovereign"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "solVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
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
    }
  ],
  "accounts": [
    {
      "name": "creatorFeeTracker",
      "discriminator": [
        144,
        62,
        251,
        103,
        232,
        2,
        131,
        177
      ]
    },
    {
      "name": "depositRecord",
      "discriminator": [
        83,
        232,
        10,
        31,
        251,
        49,
        189,
        167
      ]
    },
    {
      "name": "nftListing",
      "discriminator": [
        254,
        39,
        90,
        234,
        155,
        58,
        137,
        70
      ]
    },
    {
      "name": "proposal",
      "discriminator": [
        26,
        94,
        189,
        187,
        116,
        136,
        53,
        33
      ]
    },
    {
      "name": "protocolState",
      "discriminator": [
        33,
        51,
        173,
        134,
        35,
        140,
        195,
        248
      ]
    },
    {
      "name": "sovereignState",
      "discriminator": [
        42,
        162,
        40,
        206,
        227,
        8,
        23,
        212
      ]
    },
    {
      "name": "voteRecord",
      "discriminator": [
        112,
        9,
        123,
        165,
        234,
        9,
        157,
        167
      ]
    }
  ],
  "events": [
    {
      "name": "activityCheckExecuted",
      "discriminator": [
        136,
        51,
        54,
        218,
        40,
        224,
        168,
        118
      ]
    },
    {
      "name": "activityCheckInitiated",
      "discriminator": [
        210,
        119,
        56,
        139,
        58,
        205,
        209,
        215
      ]
    },
    {
      "name": "bondingFailed",
      "discriminator": [
        252,
        251,
        221,
        232,
        244,
        209,
        15,
        53
      ]
    },
    {
      "name": "collectionInitialized",
      "discriminator": [
        254,
        157,
        250,
        175,
        1,
        48,
        188,
        53
      ]
    },
    {
      "name": "creatorEscrowed",
      "discriminator": [
        36,
        170,
        128,
        250,
        50,
        101,
        251,
        139
      ]
    },
    {
      "name": "creatorFailedWithdrawal",
      "discriminator": [
        111,
        25,
        187,
        111,
        199,
        230,
        62,
        62
      ]
    },
    {
      "name": "creatorFeeShareUpdated",
      "discriminator": [
        1,
        11,
        54,
        164,
        187,
        102,
        133,
        196
      ]
    },
    {
      "name": "creatorTransferFeesClaimed",
      "discriminator": [
        195,
        54,
        49,
        194,
        225,
        10,
        62,
        150
      ]
    },
    {
      "name": "creatorUnwindClaimed",
      "discriminator": [
        40,
        118,
        40,
        67,
        133,
        10,
        47,
        120
      ]
    },
    {
      "name": "emergencyCreatorWithdrawal",
      "discriminator": [
        123,
        168,
        232,
        181,
        255,
        40,
        196,
        254
      ]
    },
    {
      "name": "emergencyWithdrawal",
      "discriminator": [
        225,
        77,
        96,
        117,
        149,
        211,
        83,
        71
      ]
    },
    {
      "name": "failedWithdrawal",
      "discriminator": [
        123,
        179,
        129,
        126,
        250,
        130,
        70,
        107
      ]
    },
    {
      "name": "genesisNftMinted",
      "discriminator": [
        195,
        85,
        73,
        18,
        12,
        205,
        137,
        16
      ]
    },
    {
      "name": "investorDeposited",
      "discriminator": [
        167,
        232,
        74,
        118,
        168,
        48,
        249,
        170
      ]
    },
    {
      "name": "investorWithdrew",
      "discriminator": [
        253,
        253,
        70,
        118,
        149,
        54,
        114,
        18
      ]
    },
    {
      "name": "nftDelisted",
      "discriminator": [
        248,
        161,
        199,
        108,
        92,
        55,
        160,
        180
      ]
    },
    {
      "name": "nftFrozen",
      "discriminator": [
        233,
        113,
        249,
        164,
        132,
        100,
        8,
        103
      ]
    },
    {
      "name": "nftListed",
      "discriminator": [
        115,
        235,
        107,
        89,
        89,
        231,
        135,
        26
      ]
    },
    {
      "name": "nftRoyaltyConfigUpdated",
      "discriminator": [
        36,
        155,
        116,
        230,
        190,
        103,
        5,
        150
      ]
    },
    {
      "name": "nftSold",
      "discriminator": [
        82,
        21,
        49,
        86,
        87,
        54,
        132,
        103
      ]
    },
    {
      "name": "nftTransferred",
      "discriminator": [
        95,
        48,
        137,
        119,
        53,
        125,
        158,
        178
      ]
    },
    {
      "name": "proposalCreated",
      "discriminator": [
        186,
        8,
        160,
        108,
        81,
        13,
        51,
        206
      ]
    },
    {
      "name": "proposalFinalized",
      "discriminator": [
        159,
        104,
        210,
        220,
        86,
        209,
        61,
        51
      ]
    },
    {
      "name": "protocolFeesUpdated",
      "discriminator": [
        190,
        127,
        198,
        224,
        14,
        253,
        180,
        26
      ]
    },
    {
      "name": "protocolInitialized",
      "discriminator": [
        173,
        122,
        168,
        254,
        9,
        118,
        76,
        132
      ]
    },
    {
      "name": "sellFeeRenounced",
      "discriminator": [
        71,
        16,
        49,
        205,
        14,
        68,
        227,
        230
      ]
    },
    {
      "name": "sellFeeUpdated",
      "discriminator": [
        235,
        17,
        140,
        227,
        117,
        113,
        8,
        217
      ]
    },
    {
      "name": "sovereignClosed",
      "discriminator": [
        220,
        11,
        229,
        104,
        150,
        43,
        160,
        218
      ]
    },
    {
      "name": "sovereignCreated",
      "discriminator": [
        201,
        212,
        126,
        161,
        113,
        210,
        185,
        208
      ]
    },
    {
      "name": "sovereignHalted",
      "discriminator": [
        124,
        242,
        81,
        56,
        7,
        194,
        12,
        34
      ]
    },
    {
      "name": "sovereignRetired",
      "discriminator": [
        70,
        248,
        217,
        190,
        17,
        148,
        108,
        219
      ]
    },
    {
      "name": "tokenCreated",
      "discriminator": [
        236,
        19,
        41,
        255,
        130,
        78,
        147,
        172
      ]
    },
    {
      "name": "tokensRedeemed",
      "discriminator": [
        45,
        78,
        148,
        246,
        116,
        201,
        3,
        13
      ]
    },
    {
      "name": "unwindClaimed",
      "discriminator": [
        27,
        150,
        94,
        107,
        97,
        155,
        0,
        251
      ]
    },
    {
      "name": "unwindExecuted",
      "discriminator": [
        206,
        6,
        243,
        239,
        134,
        228,
        10,
        39
      ]
    },
    {
      "name": "voteCast",
      "discriminator": [
        39,
        53,
        195,
        104,
        188,
        17,
        225,
        213
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidState",
      "msg": "Sovereign is not in the expected state"
    },
    {
      "code": 6001,
      "name": "invalidAccountData",
      "msg": "Invalid account data or discriminator mismatch"
    },
    {
      "code": 6002,
      "name": "deadlinePassed",
      "msg": "Bonding deadline has passed"
    },
    {
      "code": 6003,
      "name": "deadlineNotPassed",
      "msg": "Bonding deadline has not passed yet"
    },
    {
      "code": 6004,
      "name": "bondingNotComplete",
      "msg": "Bonding target not yet met"
    },
    {
      "code": 6005,
      "name": "bondingComplete",
      "msg": "Bonding target already met"
    },
    {
      "code": 6006,
      "name": "creatorDepositExceedsMax",
      "msg": "Creator deposit exceeds maximum allowed (1% of bond target)"
    },
    {
      "code": 6007,
      "name": "zeroDeposit",
      "msg": "Deposit amount is zero"
    },
    {
      "code": 6008,
      "name": "depositTooSmall",
      "msg": "Deposit amount below minimum (0.1 SOL)"
    },
    {
      "code": 6009,
      "name": "noDepositRecord",
      "msg": "No deposit record found"
    },
    {
      "code": 6010,
      "name": "zeroWithdraw",
      "msg": "Withdrawal amount is zero"
    },
    {
      "code": 6011,
      "name": "insufficientDepositBalance",
      "msg": "Insufficient deposit balance"
    },
    {
      "code": 6012,
      "name": "creatorCannotWithdrawDuringBonding",
      "msg": "Creator cannot withdraw during bonding phase"
    },
    {
      "code": 6013,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6014,
      "name": "nothingToWithdraw",
      "msg": "Nothing to withdraw"
    },
    {
      "code": 6015,
      "name": "creatorMustUseCreatorWithdraw",
      "msg": "Creator must use creator-specific withdraw instruction"
    },
    {
      "code": 6016,
      "name": "nftAlreadyMinted",
      "msg": "NFT has already been minted"
    },
    {
      "code": 6017,
      "name": "wrongNft",
      "msg": "Wrong NFT for this deposit record"
    },
    {
      "code": 6018,
      "name": "nftNotMinted",
      "msg": "NFT not yet minted"
    },
    {
      "code": 6019,
      "name": "noGenesisNft",
      "msg": "No Genesis NFT - cannot participate in governance"
    },
    {
      "code": 6020,
      "name": "votingPeriodNotEnded",
      "msg": "Voting period has not ended yet"
    },
    {
      "code": 6021,
      "name": "votingPeriodEnded",
      "msg": "Voting period has ended"
    },
    {
      "code": 6022,
      "name": "votingNotStarted",
      "msg": "Discussion period has not ended — voting has not started yet"
    },
    {
      "code": 6023,
      "name": "proposalNotActive",
      "msg": "Proposal is not active"
    },
    {
      "code": 6024,
      "name": "noVotingPower",
      "msg": "No voting power"
    },
    {
      "code": 6025,
      "name": "activeProposalExists",
      "msg": "Active proposal already exists"
    },
    {
      "code": 6026,
      "name": "proposalNotFinalized",
      "msg": "Proposal is not yet finalized — vote record cannot be closed"
    },
    {
      "code": 6027,
      "name": "activityCheckAlreadyPending",
      "msg": "Activity check already pending"
    },
    {
      "code": 6028,
      "name": "noActivityCheckPending",
      "msg": "No activity check pending"
    },
    {
      "code": 6029,
      "name": "activityCheckPeriodNotElapsed",
      "msg": "Activity check period has not elapsed"
    },
    {
      "code": 6030,
      "name": "invalidMint",
      "msg": "Invalid mint - does not match sovereign's token_mint"
    },
    {
      "code": 6031,
      "name": "invalidTreasury",
      "msg": "Invalid treasury address - cannot be zero"
    },
    {
      "code": 6032,
      "name": "invalidBondTarget",
      "msg": "Invalid bond target - must be at least 50 SOL"
    },
    {
      "code": 6033,
      "name": "invalidBondDuration",
      "msg": "Invalid bond duration - must be 7-30 days"
    },
    {
      "code": 6034,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6035,
      "name": "bondTargetMet",
      "msg": "Bond target already met"
    },
    {
      "code": 6036,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6037,
      "name": "feeTooHigh",
      "msg": "Fee too high"
    },
    {
      "code": 6038,
      "name": "sellFeeExceedsMax",
      "msg": "Sell fee exceeds maximum (3%)"
    },
    {
      "code": 6039,
      "name": "feeControlRenounced",
      "msg": "Fee control has been renounced"
    },
    {
      "code": 6040,
      "name": "missingTokenName",
      "msg": "Token Launcher: Missing token name"
    },
    {
      "code": 6041,
      "name": "missingTokenSymbol",
      "msg": "Token Launcher: Missing token symbol"
    },
    {
      "code": 6042,
      "name": "missingTokenSupply",
      "msg": "Token Launcher: Missing token supply"
    },
    {
      "code": 6043,
      "name": "invalidTokenName",
      "msg": "Token Launcher: Invalid token name (1-32 chars)"
    },
    {
      "code": 6044,
      "name": "invalidTokenSymbol",
      "msg": "Token Launcher: Invalid token symbol (1-10 chars)"
    },
    {
      "code": 6045,
      "name": "invalidTokenSupply",
      "msg": "Token Launcher: Invalid token supply (must be > 0)"
    },
    {
      "code": 6046,
      "name": "invalidMetadataUri",
      "msg": "Token Launcher: Invalid metadata URI (1-200 chars)"
    },
    {
      "code": 6047,
      "name": "invalidSovereignType",
      "msg": "Invalid sovereign type for this operation"
    },
    {
      "code": 6048,
      "name": "tokenAlreadyCreated",
      "msg": "Token has already been created for this sovereign"
    },
    {
      "code": 6049,
      "name": "missingExistingMint",
      "msg": "BYO Token: Missing existing mint address"
    },
    {
      "code": 6050,
      "name": "missingDepositAmount",
      "msg": "BYO Token: Missing deposit amount"
    },
    {
      "code": 6051,
      "name": "insufficientTokenDeposit",
      "msg": "BYO Token: Insufficient token deposit (below minimum % required)"
    },
    {
      "code": 6052,
      "name": "byoMintAuthorityNotRenounced",
      "msg": "BYO Token: Mint authority must be renounced (set to None) before creating a BYO sovereign"
    },
    {
      "code": 6053,
      "name": "byoFreezeAuthorityNotRenounced",
      "msg": "BYO Token: Freeze authority must be renounced (set to None) before creating a BYO sovereign"
    },
    {
      "code": 6054,
      "name": "byoSupplyMismatch",
      "msg": "BYO Token: Live mint supply does not match snapshot taken at create_sovereign — possible inflation or burn since creation"
    },
    {
      "code": 6055,
      "name": "vaultAmountMismatch",
      "msg": "Token vault balance does not match expected deposit amount — possible external injection or token loss"
    },
    {
      "code": 6056,
      "name": "alreadyClaimed",
      "msg": "Already claimed"
    },
    {
      "code": 6057,
      "name": "nothingToClaim",
      "msg": "Nothing to claim"
    },
    {
      "code": 6058,
      "name": "notCreator",
      "msg": "Caller is not the creator"
    },
    {
      "code": 6059,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6060,
      "name": "divisionByZero",
      "msg": "Division by zero"
    },
    {
      "code": 6061,
      "name": "noDeposits",
      "msg": "No deposits in the sovereign"
    },
    {
      "code": 6062,
      "name": "protocolPaused",
      "msg": "Protocol is currently paused"
    },
    {
      "code": 6063,
      "name": "activityCheckCooldownNotElapsed",
      "msg": "Activity check cooldown has not elapsed (7 days required)"
    },
    {
      "code": 6064,
      "name": "alreadyHalted",
      "msg": "Sovereign is already halted"
    },
    {
      "code": 6065,
      "name": "noRedemptionPool",
      "msg": "No surplus GOR available for token redemption"
    },
    {
      "code": 6066,
      "name": "noCirculatingTokens",
      "msg": "No circulating tokens to redeem against"
    },
    {
      "code": 6067,
      "name": "redemptionWindowExpired",
      "msg": "Token redemption window has expired"
    },
    {
      "code": 6068,
      "name": "redemptionWindowNotExpired",
      "msg": "Token redemption window has not expired yet"
    },
    {
      "code": 6069,
      "name": "insufficientAccounts",
      "msg": "Insufficient remaining accounts provided"
    },
    {
      "code": 6070,
      "name": "noPendingAuthorityTransfer",
      "msg": "No pending authority transfer"
    },
    {
      "code": 6071,
      "name": "invalidTokenProgram",
      "msg": "Invalid token program - must be SPL Token or Token-2022"
    },
    {
      "code": 6072,
      "name": "swapFeeOutOfRange",
      "msg": "Swap fee must be between 100 and 300 bps (1% - 3%)"
    },
    {
      "code": 6073,
      "name": "alreadyInitialized",
      "msg": "Already initialized"
    },
    {
      "code": 6074,
      "name": "nftAlreadyListed",
      "msg": "NFT is already listed for sale"
    },
    {
      "code": 6075,
      "name": "nftNotListed",
      "msg": "NFT is not listed for sale"
    },
    {
      "code": 6076,
      "name": "listingPriceTooLow",
      "msg": "Listing price must be above minimum (0.01 SOL)"
    },
    {
      "code": 6077,
      "name": "nftRoyaltyTooHigh",
      "msg": "NFT royalty exceeds maximum (25%)"
    },
    {
      "code": 6078,
      "name": "invalidRoyaltyWallet",
      "msg": "Invalid royalty wallet — cannot be system program"
    },
    {
      "code": 6079,
      "name": "buyerIsSeller",
      "msg": "Buyer cannot be the seller"
    },
    {
      "code": 6080,
      "name": "notNftOwner",
      "msg": "Caller does not own this NFT"
    },
    {
      "code": 6081,
      "name": "nftIsListed",
      "msg": "NFT is currently listed — delist before transferring"
    },
    {
      "code": 6082,
      "name": "invalidNftBalance",
      "msg": "NFT token account balance is not 1"
    }
  ],
  "types": [
    {
      "name": "activityCheckExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "executor",
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "daysElapsed",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "activityCheckInitiated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "initiator",
            "type": "pubkey"
          },
          {
            "name": "initiatedAt",
            "type": "i64"
          },
          {
            "name": "executionAvailableAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bondingFailed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "bondTarget",
            "type": "u64"
          },
          {
            "name": "failedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "collectionInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collectionMint",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "createSovereignParams",
      "docs": [
        "Parameters for creating a new sovereign"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignType",
            "docs": [
              "Type of launch (TokenLaunch or BYOToken)"
            ],
            "type": {
              "defined": {
                "name": "sovereignType"
              }
            }
          },
          {
            "name": "bondTarget",
            "docs": [
              "SOL to raise (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "bondDuration",
            "docs": [
              "Duration in seconds (7-30 days)"
            ],
            "type": "i64"
          },
          {
            "name": "name",
            "docs": [
              "Sovereign name (for metadata)"
            ],
            "type": "string"
          },
          {
            "name": "tokenName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "tokenSymbol",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "tokenSupply",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "sellFeeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "metadataUri",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "depositAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "swapFeeBps",
            "docs": [
              "Swap fee in basis points (engine pool swap fee)"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "createTokenParams",
      "docs": [
        "Parameters for creating a new token for a TokenLaunch sovereign"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "docs": [
              "Token name for metadata"
            ],
            "type": "string"
          },
          {
            "name": "symbol",
            "docs": [
              "Token symbol for metadata"
            ],
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Metadata URI (IPFS/Arweave)"
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "creatorEscrowed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalEscrowed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "creatorFailedWithdrawal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "escrowReturned",
            "type": "u64"
          },
          {
            "name": "creationFeeReturned",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "creatorFeeShareUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldCreatorFeeShareBps",
            "type": "u16"
          },
          {
            "name": "newCreatorFeeShareBps",
            "type": "u16"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "creatorFeeTracker",
      "docs": [
        "Tracks creator's fee revenue and purchased tokens",
        "Separate from DepositRecord because creator has different rules:",
        "- Creator deposits TOKENS (not SOL to LP)",
        "- Creator's SOL is escrowed for market buy",
        "- Creator does NOT get Genesis NFT",
        "- Creator does NOT get LP fee share"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereign",
            "docs": [
              "The sovereign this tracker belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "The creator's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "padTotalEarned",
            "docs": [
              "DEPRECATED — was total_earned, never written"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "padTotalClaimed",
            "docs": [
              "DEPRECATED — was total_claimed, never written"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "padPendingWithdrawal",
            "docs": [
              "DEPRECATED — was pending_withdrawal, never populated"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "padThresholdRenounced",
            "docs": [
              "DEPRECATED — was threshold_renounced"
            ],
            "type": "u8"
          },
          {
            "name": "purchasedTokens",
            "docs": [
              "Tokens purchased via market buy (from escrowed SOL)"
            ],
            "type": "u64"
          },
          {
            "name": "tokensLocked",
            "docs": [
              "Whether purchased tokens are locked"
            ],
            "type": "bool"
          },
          {
            "name": "purchasedTokensClaimed",
            "docs": [
              "Whether creator has claimed purchased tokens (after recovery)"
            ],
            "type": "bool"
          },
          {
            "name": "tokensClaimed",
            "docs": [
              "Whether creator has claimed unwind tokens (LP tokens + purchased)"
            ],
            "type": "bool"
          },
          {
            "name": "padSellTaxAccumulated",
            "docs": [
              "DEPRECATED — was sell_tax_accumulated, never written"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "padSellTaxClaimed",
            "docs": [
              "DEPRECATED — was sell_tax_claimed"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "failedReclaimed",
            "docs": [
              "Whether creator has reclaimed on failed bonding"
            ],
            "type": "bool"
          },
          {
            "name": "purchasedAt",
            "docs": [
              "Timestamp when tokens were purchased"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "creatorTransferFeesClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "creatorUnwindClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "surplusGor",
            "type": "u64"
          },
          {
            "name": "tokensReturned",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "depositRecord",
      "docs": [
        "Tracks an investor's deposit in a sovereign",
        "One DepositRecord per depositor per sovereign",
        "NOTE: Creator does NOT have a DepositRecord (they use CreatorFeeTracker)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereign",
            "docs": [
              "The sovereign this deposit belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "docs": [
              "The investor's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount deposited in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "positionBps",
            "docs": [
              "Canonical position share in basis points (replaces shares_bps + voting_power_bps).",
              "Set at NFT mint time; used for SOL-share, fee-share, and governance weight."
            ],
            "type": "u16"
          },
          {
            "name": "genesisNftMint",
            "docs": [
              "Genesis NFT mint address (set on finalization)"
            ],
            "type": "pubkey"
          },
          {
            "name": "padFeesClaimed",
            "docs": [
              "DEPRECATED. Previously tracked depositor fee claims (vault was never funded).",
              "Preserved as padding for account layout compatibility."
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "nftMint",
            "docs": [
              "NFT mint address (if minted)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "padVotingPowerBps",
            "docs": [
              "DEPRECATED: was voting_power_bps — superseded by position_bps at the same memory offset.",
              "Preserved as explicit byte padding to prevent accidental reads/writes."
            ],
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "nftMinted",
            "docs": [
              "Whether NFT has been minted"
            ],
            "type": "bool"
          },
          {
            "name": "unwindClaimed",
            "docs": [
              "Whether investor has claimed unwind distribution"
            ],
            "type": "bool"
          },
          {
            "name": "refundClaimed",
            "docs": [
              "Whether investor has claimed failed bonding refund"
            ],
            "type": "bool"
          },
          {
            "name": "depositedAt",
            "docs": [
              "Timestamp of initial deposit"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "emergencyCreatorWithdrawal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "escrowReturned",
            "type": "u64"
          },
          {
            "name": "creationFeeReturned",
            "type": "u64"
          },
          {
            "name": "tokensBurned",
            "type": "bool"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "emergencyWithdrawal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "failedWithdrawal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "feeMode",
      "docs": [
        "Fee distribution mode — DEPRECATED.",
        "All sovereigns now use a single model: transfer fees always go to creator,",
        "swap fees go to recovery until LPs are made whole.",
        "Kept as enum for on-chain account layout compatibility."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "creatorRevenue"
          },
          {
            "name": "recoveryBoost"
          },
          {
            "name": "fairLaunch"
          }
        ]
      }
    },
    {
      "name": "genesisNftMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "votingPowerBps",
            "type": "u16"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "investorDeposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "depositorCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "investorWithdrew",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "remainingDeposit",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "nftDelisted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "nftFrozen",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "nftListed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "listedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "nftListing",
      "docs": [
        "Tracks an active NFT listing on the protocol marketplace.",
        "One NftListing per NFT mint (PDA seeded by nft_mint).",
        "Created by list_nft, closed by buy_nft or delist_nft."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "docs": [
              "Seller's wallet address (current NFT holder)"
            ],
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "docs": [
              "The Genesis NFT mint being listed"
            ],
            "type": "pubkey"
          },
          {
            "name": "sovereign",
            "docs": [
              "The sovereign this NFT belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "price",
            "docs": [
              "Asking price in lamports (SOL)"
            ],
            "type": "u64"
          },
          {
            "name": "listedAt",
            "docs": [
              "Timestamp when listed"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "nftRoyaltyConfigUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldRoyaltyBps",
            "type": "u16"
          },
          {
            "name": "newRoyaltyBps",
            "type": "u16"
          },
          {
            "name": "oldRoyaltyWallet",
            "type": "pubkey"
          },
          {
            "name": "newRoyaltyWallet",
            "type": "pubkey"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "nftSold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "royaltyAmount",
            "type": "u64"
          },
          {
            "name": "sellerProceeds",
            "type": "u64"
          },
          {
            "name": "royaltyWallet",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "nftTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "docs": [
        "Unwind proposal during Recovery phase",
        "Only investors can create and vote (creator excluded)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereign",
            "docs": [
              "The sovereign this proposal belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "proposalId",
            "docs": [
              "Unique proposal ID within the sovereign"
            ],
            "type": "u64"
          },
          {
            "name": "proposer",
            "docs": [
              "Address that created the proposal"
            ],
            "type": "pubkey"
          },
          {
            "name": "status",
            "docs": [
              "Current status"
            ],
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "votesForBps",
            "docs": [
              "Total votes for (in basis points of total shares)"
            ],
            "type": "u32"
          },
          {
            "name": "votesAgainstBps",
            "docs": [
              "Total votes against (in basis points of total shares)"
            ],
            "type": "u32"
          },
          {
            "name": "totalVotedBps",
            "docs": [
              "Total participation (in basis points of total shares)"
            ],
            "type": "u32"
          },
          {
            "name": "voterCount",
            "docs": [
              "Number of unique voters"
            ],
            "type": "u32"
          },
          {
            "name": "quorumBps",
            "docs": [
              "Required quorum in basis points (default 6700 = 67%)"
            ],
            "type": "u16"
          },
          {
            "name": "passThresholdBps",
            "docs": [
              "Required pass threshold in basis points (default 5100 = 51%)"
            ],
            "type": "u16"
          },
          {
            "name": "votingEndsAt",
            "docs": [
              "Voting period end timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "votingStartsAt",
            "docs": [
              "Voting period start timestamp (after discussion/grace period)"
            ],
            "type": "i64"
          },
          {
            "name": "timelockEndsAt",
            "docs": [
              "Timelock end timestamp (when execution is allowed)"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when proposal was created"
            ],
            "type": "i64"
          },
          {
            "name": "executedAt",
            "docs": [
              "Timestamp when proposal was executed (0 if not executed)"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proposalCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "votingStartsAt",
            "type": "i64"
          },
          {
            "name": "votingEndsAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "votesFor",
            "type": "u64"
          },
          {
            "name": "votesAgainst",
            "type": "u64"
          },
          {
            "name": "participationBps",
            "type": "u16"
          },
          {
            "name": "passed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "proposalStatus",
      "docs": [
        "Status of a governance proposal"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "passed"
          },
          {
            "name": "failed"
          },
          {
            "name": "executed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "protocolFeesUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creationFeeBps",
            "type": "u16"
          },
          {
            "name": "minFeeLamports",
            "type": "u64"
          },
          {
            "name": "minDeposit",
            "type": "u64"
          },
          {
            "name": "minBondTarget",
            "type": "u64"
          },
          {
            "name": "unwindFeeBps",
            "type": "u16"
          },
          {
            "name": "byoMinSupplyBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "protocolInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "protocolState",
      "docs": [
        "Protocol-level configuration and statistics",
        "Single PDA managing global settings for the Sovereign Liquidity Protocol"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Protocol admin - can update fees and settings"
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Treasury wallet receiving protocol fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "creationFeeBps",
            "docs": [
              "Creation fee in basis points (0-1000 = 0-10% of bond target)",
              "Default: 100 (1%)"
            ],
            "type": "u16"
          },
          {
            "name": "minFeeLamports",
            "docs": [
              "Minimum fee in lamports (non-refundable on failed bonding)",
              "Default: 0.05 SOL (50_000_000 lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "governanceUnwindFeeLamports",
            "docs": [
              "Fee to create unwind proposal during recovery phase",
              "Default: 0.05 SOL (50_000_000 lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "unwindFeeBps",
            "docs": [
              "Fee taken from total WGOR during governance-driven unwind (0-2000 = 0-20%)",
              "NOT applied during emergency unwind. Default: 2000 (20%)"
            ],
            "type": "u16"
          },
          {
            "name": "byoMinSupplyBps",
            "docs": [
              "Minimum % of supply required for BYO Token launch",
              "Default: 3000 (30%)"
            ],
            "type": "u16"
          },
          {
            "name": "minBondTarget",
            "docs": [
              "Minimum bond target in lamports (50 SOL)"
            ],
            "type": "u64"
          },
          {
            "name": "minDeposit",
            "docs": [
              "Minimum single deposit in lamports (0.1 SOL)"
            ],
            "type": "u64"
          },
          {
            "name": "autoUnwindPeriod",
            "docs": [
              "Auto-unwind period in seconds (90-365 days)",
              "Protocol-controlled for Active phase activity check"
            ],
            "type": "i64"
          },
          {
            "name": "minFeeGrowthThreshold",
            "docs": [
              "Minimum fee growth (Q64.64 delta) during 90-day observation period",
              "to prove the sovereign is still viable and cancel the unwind.",
              "Default: 1.25% of total_deposited annualized (5% APR / 4 quarters).",
              "Adjustable by protocol authority."
            ],
            "type": "u128"
          },
          {
            "name": "padFeeThresholdRenounced",
            "docs": [
              "Padding: was fee_threshold_renounced (bool, 1 byte) — removed"
            ],
            "type": "u8"
          },
          {
            "name": "paused",
            "docs": [
              "Emergency pause flag"
            ],
            "type": "bool"
          },
          {
            "name": "sovereignCount",
            "docs": [
              "Total sovereigns created"
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesCollected",
            "docs": [
              "Lifetime protocol revenue in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "votingPeriod",
            "docs": [
              "Voting period for governance proposals (in seconds)",
              "Default: 7 days (604_800)"
            ],
            "type": "i64"
          },
          {
            "name": "observationPeriod",
            "docs": [
              "Observation period after passed vote / activity check (in seconds)",
              "Default: 90 days (7_776_000)"
            ],
            "type": "i64"
          },
          {
            "name": "governanceQuorumBps",
            "docs": [
              "Quorum requirement for governance votes (in BPS)",
              "Default: 6700 (67%)"
            ],
            "type": "u16"
          },
          {
            "name": "governancePassThresholdBps",
            "docs": [
              "Pass threshold for governance votes (in BPS of votes cast)",
              "Default: 5100 (51%)"
            ],
            "type": "u16"
          },
          {
            "name": "discussionPeriod",
            "docs": [
              "Discussion/grace period before voting opens (in seconds)",
              "Gives creators time to address concerns before votes can be cast.",
              "Default: 3 days (259_200)"
            ],
            "type": "i64"
          },
          {
            "name": "keeper",
            "docs": [
              "Authorized keeper bot wallet for vault automation.",
              "Can call rebalance/compound with priority over public callers.",
              "Set by protocol authority via update_keeper instruction.",
              "NOTE: Placed at end to be backwards-compatible with pre-keeper accounts (reads from padding)."
            ],
            "type": "pubkey"
          },
          {
            "name": "pendingAuthority",
            "docs": [
              "Pending authority for two-step authority transfer"
            ],
            "type": "pubkey"
          },
          {
            "name": "defaultSwapFeeBps",
            "docs": [
              "Default swap fee applied to every sovereign's engine pool once",
              "recovery completes (Recovery → Active).  Creators choose a",
              "higher rate (1-3%) during recovery; this value replaces it.",
              "Default: 30 bps (0.30%)"
            ],
            "type": "u16"
          },
          {
            "name": "collectionMint",
            "docs": [
              "Collection NFT mint address — set once by initialize_collection.",
              "Used by mint_genesis_nft to verify collection membership."
            ],
            "type": "pubkey"
          },
          {
            "name": "creatorFeeShareBps",
            "docs": [
              "Creator's share of LP swap fees in BPS (0–5000 = 0–50%).",
              "Default: 2000 (20%). Remainder goes to bin LPs.",
              "Adjustable by protocol authority via update_protocol_fees."
            ],
            "type": "u16"
          },
          {
            "name": "nftRoyaltyBps",
            "docs": [
              "Royalty percentage on NFT sales in BPS (0–2500 = 0–25%).",
              "Default: 500 (5%). Applied to every buy_nft transaction."
            ],
            "type": "u16"
          },
          {
            "name": "nftRoyaltyWallet",
            "docs": [
              "Wallet that receives NFT sale royalties.",
              "Default: treasury. Settable by protocol authority."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "sellFeeRenounced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "oldFeeBps",
            "type": "u16"
          },
          {
            "name": "renouncedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "sellFeeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "oldFeeBps",
            "type": "u16"
          },
          {
            "name": "newFeeBps",
            "type": "u16"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "sovereignClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "solSwept",
            "type": "u64"
          },
          {
            "name": "tokensBurned",
            "type": "u64"
          },
          {
            "name": "rentRecovered",
            "type": "u64"
          },
          {
            "name": "closedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sovereignCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "sovereignType",
            "type": {
              "defined": {
                "name": "sovereignType"
              }
            }
          },
          {
            "name": "bondTarget",
            "type": "u64"
          },
          {
            "name": "bondDeadline",
            "type": "i64"
          },
          {
            "name": "tokenSupplyDeposited",
            "type": "u64"
          },
          {
            "name": "creationFeeEscrowed",
            "type": "u64"
          },
          {
            "name": "sellFeeBps",
            "type": "u16"
          },
          {
            "name": "swapFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "sovereignHalted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "caller",
            "type": "pubkey"
          },
          {
            "name": "previousState",
            "type": "u8"
          },
          {
            "name": "haltedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sovereignRetired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "retiredAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sovereignState",
      "docs": [
        "Main sovereign state account - one per token launch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "docs": [
              "Unique identifier for this sovereign"
            ],
            "type": "u64"
          },
          {
            "name": "creator",
            "docs": [
              "Creator's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "Token mint address (created or BYO)"
            ],
            "type": "pubkey"
          },
          {
            "name": "sovereignType",
            "docs": [
              "Type of launch (TokenLaunch or BYOToken)"
            ],
            "type": {
              "defined": {
                "name": "sovereignType"
              }
            }
          },
          {
            "name": "state",
            "docs": [
              "Current lifecycle state"
            ],
            "type": {
              "defined": {
                "name": "sovereignStatus"
              }
            }
          },
          {
            "name": "name",
            "docs": [
              "Sovereign name (max 32 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "tokenName",
            "docs": [
              "Token name (max 32 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "tokenSymbol",
            "docs": [
              "Token symbol (max 10 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "metadataUri",
            "docs": [
              "Metadata URI (max 200 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "bondTarget",
            "docs": [
              "Required SOL to raise (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "bondDeadline",
            "docs": [
              "Unix timestamp deadline for bonding"
            ],
            "type": "i64"
          },
          {
            "name": "bondDuration",
            "docs": [
              "Duration in seconds (for reference)"
            ],
            "type": "i64"
          },
          {
            "name": "totalDeposited",
            "docs": [
              "Total SOL deposited by investors (excludes creator escrow)"
            ],
            "type": "u64"
          },
          {
            "name": "depositorCount",
            "docs": [
              "Number of unique investor depositors"
            ],
            "type": "u32"
          },
          {
            "name": "creatorEscrow",
            "docs": [
              "Creator's escrowed SOL for market buy (max 1% of bond target)"
            ],
            "type": "u64"
          },
          {
            "name": "tokenSupplyDeposited",
            "docs": [
              "Tokens deposited by creator (100% for TokenLaunch, >=30% for BYO)"
            ],
            "type": "u64"
          },
          {
            "name": "tokenTotalSupply",
            "docs": [
              "Total supply of token (for BYO verification)"
            ],
            "type": "u64"
          },
          {
            "name": "sellFeeBps",
            "docs": [
              "Sell fee in basis points (0-300 = 0-3%)"
            ],
            "type": "u16"
          },
          {
            "name": "feeMode",
            "docs": [
              "Fee distribution mode — DEPRECATED (ignored by all instructions).",
              "Preserved for account layout compatibility."
            ],
            "type": {
              "defined": {
                "name": "feeMode"
              }
            }
          },
          {
            "name": "feeControlRenounced",
            "docs": [
              "If true, creator cannot change sell_fee_bps"
            ],
            "type": "bool"
          },
          {
            "name": "creationFeeEscrowed",
            "docs": [
              "Amount held in creation fee escrow PDA"
            ],
            "type": "u64"
          },
          {
            "name": "padAmmConfig",
            "docs": [
              "Padding: was amm_config (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "swapFeeBps",
            "docs": [
              "Engine pool swap fee in basis points"
            ],
            "type": "u16"
          },
          {
            "name": "padPreset",
            "docs": [
              "Padding: was preset_parameter (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padBinStep",
            "docs": [
              "Padding: was bin_step (u16, 2 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "padActiveId",
            "docs": [
              "Padding: was active_id_at_launch (i32, 4 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "padLowerBin",
            "docs": [
              "Padding: was lower_bin_id (i32, 4 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "padUpperBin",
            "docs": [
              "Padding: was upper_bin_id (i32, 4 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "padPositionBase",
            "docs": [
              "Padding: was position_base (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padPoolState",
            "docs": [
              "Padding: was pool_state (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padLbPair",
            "docs": [
              "Padding: was lb_pair (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padPositionMint",
            "docs": [
              "Padding: was position_mint (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padPosition",
            "docs": [
              "Padding: was position (Pubkey, 32 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padPoolRestricted",
            "docs": [
              "Padding: was pool_restricted (bool, 1 byte)"
            ],
            "type": "u8"
          },
          {
            "name": "recoveryTarget",
            "docs": [
              "Target SOL to recover (equals total_deposited)"
            ],
            "type": "u64"
          },
          {
            "name": "totalSolFeesDistributed",
            "docs": [
              "Total SOL fees distributed to investors"
            ],
            "type": "u64"
          },
          {
            "name": "padTokenFees",
            "docs": [
              "Padding: was total_token_fees_distributed (u64, 8 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "recoveryComplete",
            "docs": [
              "Whether recovery phase is complete"
            ],
            "type": "bool"
          },
          {
            "name": "activeProposalId",
            "docs": [
              "Active proposal ID (0 if none)"
            ],
            "type": "u64"
          },
          {
            "name": "proposalCount",
            "docs": [
              "Total proposals created"
            ],
            "type": "u64"
          },
          {
            "name": "hasActiveProposal",
            "docs": [
              "Whether there's an active proposal"
            ],
            "type": "bool"
          },
          {
            "name": "padFeeThreshold",
            "docs": [
              "Padding: was fee_threshold_bps (u16, 2 bytes) — removed, never consumed"
            ],
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "totalFeesCollected",
            "docs": [
              "Total fees collected (for tracking)"
            ],
            "type": "u64"
          },
          {
            "name": "totalRecovered",
            "docs": [
              "Total recovered during recovery phase"
            ],
            "type": "u64"
          },
          {
            "name": "padTotalSupply",
            "docs": [
              "Padding: was total_supply (u64, 8 bytes)"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "genesisNftMint",
            "docs": [
              "Genesis NFT collection mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "unwoundAt",
            "docs": [
              "Timestamp when unwound (if applicable)"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "lastActivity",
            "docs": [
              "Last activity timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "activityCheckInitiated",
            "docs": [
              "Whether an unwind observation period is in progress"
            ],
            "type": "bool"
          },
          {
            "name": "activityCheckInitiatedAt",
            "docs": [
              "Timestamp when unwind observation was initiated (Option for cleaner handling)"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "activityCheckTimestamp",
            "docs": [
              "Timestamp when unwind observation period ends (90 days after vote passes)"
            ],
            "type": "i64"
          },
          {
            "name": "feeGrowthSnapshotA",
            "docs": [
              "Snapshot of SAMM fee_growth_global_0_x64 at vote pass time",
              "For DLMM: total_claimed_fee_x from position at snapshot time"
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthSnapshotB",
            "docs": [
              "Snapshot of SAMM fee_growth_global_1_x64 at vote pass time",
              "For DLMM: total_claimed_fee_y from position at snapshot time"
            ],
            "type": "u128"
          },
          {
            "name": "activityCheckLastCancelled",
            "docs": [
              "Timestamp of last cancelled unwind observation (for cooldown)"
            ],
            "type": "i64"
          },
          {
            "name": "unwindSolBalance",
            "docs": [
              "SOL balance after removing liquidity (for claiming)"
            ],
            "type": "u64"
          },
          {
            "name": "unwindTokenBalance",
            "docs": [
              "Token balance after removing liquidity (for creator)"
            ],
            "type": "u64"
          },
          {
            "name": "tokenRedemptionPool",
            "docs": [
              "Surplus GOR available for external token holder redemption",
              "= max(0, unwind_sol_balance - total_deposited)"
            ],
            "type": "u64"
          },
          {
            "name": "circulatingTokensAtUnwind",
            "docs": [
              "Snapshot of circulating tokens at time of LP removal",
              "= mint.supply - token_vault.amount - lock_ata_tokens"
            ],
            "type": "u64"
          },
          {
            "name": "tokenRedemptionDeadline",
            "docs": [
              "Deadline for token holders to redeem surplus GOR (unix timestamp).",
              "After this, unclaimed GOR is swept to treasury."
            ],
            "type": "i64"
          },
          {
            "name": "lastActivityTimestamp",
            "docs": [
              "Last fee collection or activity timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when sovereign was created"
            ],
            "type": "i64"
          },
          {
            "name": "finalizedAt",
            "docs": [
              "Timestamp when finalized (LP created)"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "padCreatorFeeWallet",
            "docs": [
              "DEPRECATED. Previously stored the creator's fee destination wallet.",
              "Preserved as padding for account layout compatibility."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalUnwindClaimed",
            "docs": [
              "Total GOR claimed by NFT holders via claim_unwind"
            ],
            "type": "u64"
          },
          {
            "name": "totalSurplusRedeemed",
            "docs": [
              "Total surplus GOR redeemed by token holders via redeem_tokens_for_gor"
            ],
            "type": "u64"
          },
          {
            "name": "creatorUnwindSurplus",
            "docs": [
              "BYO unwind: surplus GOR above investor principal, earmarked for creator.",
              "Zero for TokenLaunch (surplus goes to token_redemption_pool instead)."
            ],
            "type": "u64"
          },
          {
            "name": "creatorUnwindClaimed",
            "docs": [
              "True after creator has claimed their unwind tokens and surplus GOR.",
              "Prevents double-claim if token_vault receives tokens after claim."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "sovereignStatus",
      "docs": [
        "Current state of the sovereign lifecycle"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "bonding"
          },
          {
            "name": "finalizing"
          },
          {
            "name": "poolCreated"
          },
          {
            "name": "recovery"
          },
          {
            "name": "active"
          },
          {
            "name": "unwinding"
          },
          {
            "name": "unwound"
          },
          {
            "name": "failed"
          },
          {
            "name": "halted"
          },
          {
            "name": "retired"
          }
        ]
      }
    },
    {
      "name": "sovereignType",
      "docs": [
        "Type of token launch"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "tokenLaunch"
          },
          {
            "name": "byoToken"
          }
        ]
      }
    },
    {
      "name": "tokenCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "tokensRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "redeemer",
            "type": "pubkey"
          },
          {
            "name": "tokensTransferred",
            "type": "u64"
          },
          {
            "name": "gorReceived",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "unwindClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "claimer",
            "type": "pubkey"
          },
          {
            "name": "solAmount",
            "type": "u64"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "unwindExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "solAmount",
            "type": "u64"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "voteCast",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sovereignId",
            "type": "u64"
          },
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "support",
            "type": "bool"
          },
          {
            "name": "votingPower",
            "type": "u64"
          },
          {
            "name": "votesFor",
            "type": "u64"
          },
          {
            "name": "votesAgainst",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "voteRecord",
      "docs": [
        "Individual vote record to prevent double voting"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposal",
            "docs": [
              "The proposal this vote belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "voter",
            "docs": [
              "The voter's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "genesisNftMint",
            "docs": [
              "Genesis NFT used for voting"
            ],
            "type": "pubkey"
          },
          {
            "name": "votingPowerBps",
            "docs": [
              "Voting power in basis points (from DepositRecord.shares_bps)"
            ],
            "type": "u16"
          },
          {
            "name": "voteFor",
            "docs": [
              "Whether voted for (true) or against (false)"
            ],
            "type": "bool"
          },
          {
            "name": "votedAt",
            "docs": [
              "Timestamp of vote"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
