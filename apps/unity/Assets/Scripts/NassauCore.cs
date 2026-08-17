using System;
using System.Collections.Generic;
using System.Linq;

namespace Nassau
{
    public enum GoodType
    {
        RoyalJewels,
        GoldChests,
        SpanishSilver,
        Rum,
        Tobacco,
        Provisions
    }

    [Serializable]
    public sealed class GoodInfo
    {
        public string Label;
        public string Icon;
        public int Supply;
        public int[] Values;
        public int Minimum;

        public GoodInfo(string label, string icon, int supply, int[] values, int minimum)
        {
            Label = label;
            Icon = icon;
            Supply = supply;
            Values = values;
            Minimum = minimum;
        }
    }

    public static class Goods
    {
        public static readonly GoodType[] Order =
        {
            GoodType.RoyalJewels,
            GoodType.GoldChests,
            GoodType.SpanishSilver,
            GoodType.Rum,
            GoodType.Tobacco,
            GoodType.Provisions
        };

        public static readonly Dictionary<GoodType, GoodInfo> Info = new Dictionary<GoodType, GoodInfo>
        {
            { GoodType.RoyalJewels, new GoodInfo("Joias Reais", "👑", 6, new[] { 7, 7, 5, 5 }, 2) },
            { GoodType.GoldChests, new GoodInfo("Baús de Ouro", "🪎", 6, new[] { 6, 6, 5, 5 }, 2) },
            { GoodType.SpanishSilver, new GoodInfo("Prataria Espanhola", "🥈", 6, new[] { 5, 5, 5, 5 }, 2) },
            { GoodType.Rum, new GoodInfo("Rum", "🛢️", 8, new[] { 5, 3, 3, 2, 2 }, 1) },
            { GoodType.Tobacco, new GoodInfo("Tabaco", "🍂", 8, new[] { 5, 3, 3, 2, 2, 1 }, 1) },
            { GoodType.Provisions, new GoodInfo("Mantimentos", "📦", 10, new[] { 4, 3, 2, 1, 1, 1, 1, 1 }, 1) }
        };

        public const int CrewSupply = 11;
    }

    [Serializable]
    public sealed class NassauItem
    {
        public string Id;
        public bool IsCrew;
        public GoodType Type;

        public NassauItem(string id, GoodType type)
        {
            Id = id;
            Type = type;
            IsCrew = false;
        }

        public NassauItem(string id)
        {
            Id = id;
            IsCrew = true;
        }

        public NassauItem Clone() => IsCrew ? new NassauItem(Id) : new NassauItem(Id, Type);
    }

    [Serializable]
    public sealed class NassauPlayer
    {
        public string Id;
        public string DisplayName;
        public List<NassauItem> Goods = new List<NassauItem>();
        public int Crew;
        public int Prestige;
        public int Contracts;
        public int Rewards;
        public int ContractPrestige;

        public NassauPlayer Clone()
        {
            var copy = new NassauPlayer { Id = Id, DisplayName = DisplayName, Crew = Crew, Prestige = Prestige, Contracts = Contracts, Rewards = Rewards, ContractPrestige = ContractPrestige };
            copy.Goods = Goods.Select(item => item.Clone()).ToList();
            return copy;
        }
    }

    [Serializable]
    public sealed class NassauResult
    {
        public string WinnerId;
        public bool Draw;
        public string Reason;
    }

    [Serializable]
    public sealed class NassauState
    {
        public string Id;
        public int Seed;
        public bool Finished;
        public List<NassauPlayer> Players = new List<NassauPlayer>();
        public List<NassauItem> Deck = new List<NassauItem>();
        public List<NassauItem> Port = new List<NassauItem>();
        public Dictionary<GoodType, List<int>> Values = new Dictionary<GoodType, List<int>>();
        public string CurrentPlayerId;
        public int Turn = 1;
        public List<string> ActionLog = new List<string>();
        public NassauResult Result;

        public NassauState Clone()
        {
            var copy = new NassauState
            {
                Id = Id, Seed = Seed, Finished = Finished, CurrentPlayerId = CurrentPlayerId, Turn = Turn,
                Result = Result == null ? null : new NassauResult { WinnerId = Result.WinnerId, Draw = Result.Draw, Reason = Result.Reason }
            };
            copy.Players = Players.Select(player => player.Clone()).ToList();
            copy.Deck = Deck.Select(item => item.Clone()).ToList();
            copy.Port = Port.Select(item => item.Clone()).ToList();
            copy.Values = Values.ToDictionary(pair => pair.Key, pair => new List<int>(pair.Value));
            copy.ActionLog = new List<string>(ActionLog);
            return copy;
        }
    }

    public enum NassauActionType { TakeGood, RecruitCrew, Trade, Sell }

    [Serializable]
    public sealed class NassauAction
    {
        public NassauActionType Type;
        public string PlayerId;
        public string ItemId;
        public GoodType GoodType;
        public int Quantity;
        public List<string> TakeItemIds = new List<string>();
        public List<string> GiveGoodIds = new List<string>();
        public int GiveCrewCount;
    }

    public static class NassauEngine
    {
        public static NassauState CreateGame(int seed)
        {
            var state = new NassauState { Id = "unity-offline-" + seed, Seed = seed };
            state.Players.Add(new NassauPlayer { Id = "human", DisplayName = "Você" });
            state.Players.Add(new NassauPlayer { Id = "computer", DisplayName = "A Maré" });

            var all = new List<NassauItem>();
            foreach (var type in Goods.Order)
                for (var index = 0; index < Goods.Info[type].Supply; index++) all.Add(new NassauItem(type.ToString().ToLowerInvariant() + "-" + (index + 1), type));
            for (var index = 0; index < Goods.CrewSupply; index++) all.Add(new NassauItem("crew-" + (index + 1)));

            var crew = all.Where(item => item.IsCrew).Take(3).ToList();
            foreach (var item in crew) all.Remove(item);
            Shuffle(all, seed);
            foreach (var player in state.Players)
                for (var card = 0; card < 5; card++)
                {
                    var dealt = all[0];
                    all.RemoveAt(0);
                    if (dealt.IsCrew) player.Crew++;
                    else player.Goods.Add(dealt);
                }
            state.Port.AddRange(crew);
            for (var index = 0; index < 2; index++)
            {
                state.Port.Add(all[0]);
                all.RemoveAt(0);
            }
            state.Deck = all;
            foreach (var type in Goods.Order) state.Values[type] = new List<int>(Goods.Info[type].Values);
            state.CurrentPlayerId = state.Players[seed % 2].Id;
            return state;
        }

        public static NassauState Apply(NassauState input, NassauAction action)
        {
            var state = input.Clone();
            if (state.Finished) throw new InvalidOperationException("A partida terminou");
            if (state.CurrentPlayerId != action.PlayerId) throw new InvalidOperationException("Não é o turno deste jogador");
            var player = state.Players.First(candidate => candidate.Id == action.PlayerId);
            var endsBecauseStock = false;

            if (action.Type == NassauActionType.TakeGood)
            {
                if (player.Goods.Count >= 7) throw new InvalidOperationException("Seu porão está cheio");
                var item = state.Port.FirstOrDefault(candidate => candidate.Id == action.ItemId && !candidate.IsCrew);
                if (item == null) throw new InvalidOperationException("Mercadoria indisponível");
                state.Port.Remove(item);
                player.Goods.Add(item);
                if (state.Deck.Count > 0)
                {
                    state.Port.Add(state.Deck[0]);
                    state.Deck.RemoveAt(0);
                }
                else endsBecauseStock = true;
            }
            else if (action.Type == NassauActionType.RecruitCrew)
            {
                var crew = state.Port.Where(item => item.IsCrew).ToList();
                if (crew.Count == 0) throw new InvalidOperationException("Não há tripulação no porto");
                state.Port.RemoveAll(item => item.IsCrew);
                player.Crew += crew.Count;
                for (var index = 0; index < crew.Count && state.Deck.Count > 0; index++)
                {
                    state.Port.Add(state.Deck[0]);
                    state.Deck.RemoveAt(0);
                }
                endsBecauseStock = state.Deck.Count == 0 && state.Port.Count < 5;
            }
            else if (action.Type == NassauActionType.Trade)
            {
                if (action.TakeItemIds.Count == 0 || action.TakeItemIds.Count != action.GiveGoodIds.Count + action.GiveCrewCount)
                    throw new InvalidOperationException("A troca deve ser um por um");
                if (action.TakeItemIds.Distinct().Count() != action.TakeItemIds.Count) throw new InvalidOperationException("Item repetido na troca");
                var taken = action.TakeItemIds.Select(id => state.Port.FirstOrDefault(item => item.Id == id)).ToList();
                if (taken.Any(item => item == null || item.IsCrew)) throw new InvalidOperationException("Só mercadorias podem ser trocadas");
                var given = action.GiveGoodIds.Select(id => player.Goods.FirstOrDefault(item => item.Id == id)).ToList();
                if (given.Any(item => item == null)) throw new InvalidOperationException("Mercadoria não está no inventário");
                if (given.Any(item => taken.Any(received => received.Type == item.Type))) throw new InvalidOperationException("Não é possível trocar o mesmo tipo");
                if (action.GiveCrewCount > player.Crew) throw new InvalidOperationException("Tripulação insuficiente");
                if (player.Goods.Count - given.Count + taken.Count > 7) throw new InvalidOperationException("Seu porão ficaria cheio");
                foreach (var item in taken) state.Port.Remove(item);
                foreach (var item in given) { player.Goods.Remove(item); state.Port.Add(item); }
                player.Goods.AddRange(taken);
                player.Crew -= action.GiveCrewCount;
                for (var index = 0; index < action.GiveCrewCount; index++) state.Port.Add(new NassauItem("crew-trade-" + state.ActionLog.Count + "-" + index));
            }
            else
            {
                var info = Goods.Info[action.GoodType];
                var owned = player.Goods.Where(item => item.Type == action.GoodType).ToList();
                if (action.Quantity < info.Minimum || action.Quantity > owned.Count) throw new InvalidOperationException("Quantidade mínima para vender: " + info.Minimum);
                foreach (var item in owned.Take(action.Quantity)) player.Goods.Remove(item);
                var rewards = state.Values[action.GoodType].Take(action.Quantity).ToList();
                state.Values[action.GoodType].RemoveRange(0, Math.Min(action.Quantity, state.Values[action.GoodType].Count));
                var points = rewards.Sum();
                var contract = action.Quantity >= 5 ? 9 : action.Quantity == 4 ? 5 : action.Quantity == 3 ? 2 : 0;
                player.Rewards += points;
                player.Prestige += points + contract;
                player.ContractPrestige += contract;
                if (contract > 0) player.Contracts++;
            }

            state.ActionLog.Add(player.DisplayName + ":" + action.Type);
            if (state.Values.Count(pair => pair.Value.Count == 0) >= 3 || endsBecauseStock)
            {
                state.Finished = true;
                state.Result = new NassauResult { Reason = endsBecauseStock ? "stock-empty" : "three-empty-tracks" };
                var other = state.Players.First(candidate => candidate.Id != player.Id);
                var playerFinal = player.Prestige + (player.Crew > other.Crew ? 5 : 0);
                var otherFinal = other.Prestige + (other.Crew > player.Crew ? 5 : 0);
                if (playerFinal > otherFinal) state.Result.WinnerId = player.Id;
                else if (otherFinal > playerFinal) state.Result.WinnerId = other.Id;
                else state.Result.Draw = true;
            }
            else
            {
                state.CurrentPlayerId = state.Players.First(candidate => candidate.Id != player.Id).Id;
                if (state.ActionLog.Count % 2 == 0) state.Turn++;
            }
            return state;
        }

        public static List<NassauAction> LegalActions(NassauState state, string playerId)
        {
            var player = state.Players.First(candidate => candidate.Id == playerId);
            var actions = new List<NassauAction>();
            foreach (var item in state.Port.Where(candidate => !candidate.IsCrew))
                if (player.Goods.Count < 7) actions.Add(new NassauAction { Type = NassauActionType.TakeGood, PlayerId = playerId, ItemId = item.Id });
            if (state.Port.Any(item => item.IsCrew)) actions.Add(new NassauAction { Type = NassauActionType.RecruitCrew, PlayerId = playerId });
            foreach (var type in Goods.Order)
            {
                var count = player.Goods.Count(item => item.Type == type);
                var max = Math.Min(count, state.Values[type].Count);
                for (var quantity = Goods.Info[type].Minimum; quantity <= max; quantity++) actions.Add(new NassauAction { Type = NassauActionType.Sell, PlayerId = playerId, GoodType = type, Quantity = quantity });
            }
            foreach (var portItem in state.Port.Where(item => !item.IsCrew))
            {
                var compatible = player.Goods.Where(item => item.Type != portItem.Type).OrderBy(item => Goods.Info[item.Type].Values.FirstOrDefault()).FirstOrDefault();
                if (compatible != null) actions.Add(new NassauAction { Type = NassauActionType.Trade, PlayerId = playerId, TakeItemIds = new List<string> { portItem.Id }, GiveGoodIds = new List<string> { compatible.Id } });
                else if (player.Crew > 0) actions.Add(new NassauAction { Type = NassauActionType.Trade, PlayerId = playerId, TakeItemIds = new List<string> { portItem.Id }, GiveCrewCount = 1 });
            }
            return actions;
        }

        private static void Shuffle(List<NassauItem> items, int seed)
        {
            var value = (uint)seed;
            for (var index = items.Count - 1; index > 0; index--)
            {
                value = value * 1664525u + 1013904223u;
                var swap = (int)((value / 4294967296.0) * (index + 1));
                var item = items[index]; items[index] = items[swap]; items[swap] = item;
            }
        }
    }

    public static class NassauAi
    {
        public static NassauAction ChooseHard(NassauState state)
        {
            var actions = NassauEngine.LegalActions(state, "computer");
            if (actions.Count == 0) return null;
            var me = state.Players.First(player => player.Id == "computer");
            var opponent = state.Players.First(player => player.Id != "computer");
            return actions.OrderByDescending(action => Score(state, action, me, opponent)).First();
        }

        private static float Score(NassauState state, NassauAction action, NassauPlayer me, NassauPlayer opponent)
        {
            if (action.Type == NassauActionType.Sell)
            {
                var points = state.Values[action.GoodType].Take(action.Quantity).Sum();
                var contract = action.Quantity >= 5 ? 9 : action.Quantity == 4 ? 5 : action.Quantity == 3 ? 2 : 0;
                return points + contract * 1.8f + (state.Values[action.GoodType].Count <= action.Quantity ? 4 : 0);
            }
            if (action.Type == NassauActionType.RecruitCrew)
            {
                var crew = state.Port.Count(item => item.IsCrew);
                return crew * 4 + (me.Crew <= opponent.Crew ? 4 : 0);
            }
            if (action.Type == NassauActionType.TakeGood)
            {
                var item = state.Port.First(candidate => candidate.Id == action.ItemId);
                return Goods.Info[item.Type].Values.FirstOrDefault() * 2;
            }
            var received = action.TakeItemIds.Select(id => state.Port.First(item => item.Id == id)).Sum(item => Goods.Info[item.Type].Values.FirstOrDefault() * 1.9f);
            var given = action.GiveGoodIds.Select(id => me.Goods.First(item => item.Id == id)).Sum(item => Goods.Info[item.Type].Values.FirstOrDefault() * 1.1f);
            return received - given - action.GiveCrewCount * 4 + (me.Crew - action.GiveCrewCount > opponent.Crew ? 2 : 0);
        }
    }
}
