using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Video;
using UnityEngine.EventSystems;

namespace Nassau
{
    public sealed class NassauGameController : MonoBehaviour
    {
        private readonly List<string> selectedPortIds = new List<string>();
        private readonly List<string> selectedGoodIds = new List<string>();
        private Canvas canvas;
        private NassauState state;
        private bool aiThinking;
        private bool showSellModal;
        private Font font;

        private static readonly Color Navy = new Color32(10, 35, 45, 255);
        private static readonly Color Teal = new Color32(16, 55, 67, 255);
        private static readonly Color Gold = new Color32(214, 173, 91, 255);
        private static readonly Color Paper = new Color32(243, 234, 211, 255);

        private void Start()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            EnsureCamera();
            CreateCanvas();
            StartCoroutine(LoadingThenStart());
        }

        private IEnumerator LoadingThenStart()
        {
            var loading = new GameObject("Nassau Loading Video");
            var player = loading.AddComponent<VideoPlayer>();
            var audio = loading.AddComponent<AudioSource>();
            RenderTexture renderTexture = null;
            player.playOnAwake = false;
            player.isLooping = true;
            player.audioOutputMode = VideoAudioOutputMode.AudioSource;
            player.SetTargetAudioSource(0, audio);
            player.clip = Resources.Load<VideoClip>("splash/loading-background");
            if (player.clip != null)
            {
                var width = player.clip.width > 0 ? (int)player.clip.width : 1920;
                var height = player.clip.height > 0 ? (int)player.clip.height : 1080;
                renderTexture = new RenderTexture(width, height, 0, RenderTextureFormat.ARGB32);
                renderTexture.Create();
                player.renderMode = VideoRenderMode.RenderTexture;
                player.targetTexture = renderTexture;
                player.aspectRatio = VideoAspectRatio.FitInside;
                player.Prepare();
            }
            RenderLoading(renderTexture);
            if (player.clip != null)
            {
                var elapsed = 0f;
                while (!player.isPrepared && elapsed < 2f)
                {
                    elapsed += Time.unscaledDeltaTime;
                    yield return null;
                }
                player.Play();
            }
            yield return new WaitForSeconds(2.2f);
            Destroy(loading);
            if (renderTexture != null) Destroy(renderTexture);
            StartOfflineGame();
        }

        private void StartOfflineGame()
        {
            var seed = (int)(DateTime.UtcNow.Ticks & 0x7fffffff);
            state = NassauEngine.CreateGame(seed);
            selectedPortIds.Clear();
            selectedGoodIds.Clear();
            RenderGame();
        }

        private void RenderLoading(RenderTexture videoTexture)
        {
            ClearCanvas();
            var root = Panel(canvas.transform, Navy);
            Stretch(root);
            if (videoTexture != null)
            {
                var videoObject = new GameObject("Loading Video Image");
                videoObject.transform.SetParent(root.transform, false);
                var videoImage = videoObject.AddComponent<RawImage>();
                videoImage.texture = videoTexture;
                videoImage.color = Color.white;
                Stretch(videoImage.rectTransform);

                var overlay = Panel(root.transform, new Color(0, 0, 0, 0.24f));
                Stretch(overlay);
            }
            var title = Text(root.transform, "NASSAU", 42, Gold, TextAnchor.MiddleCenter);
            LayoutElement(title.gameObject).flexibleHeight = 1;
            var subtitle = Text(root.transform, "Carregando o Porto de Nassau...", 18, Paper, TextAnchor.MiddleCenter);
            LayoutElement(subtitle.gameObject).flexibleHeight = 1;
        }

        private void RenderGame()
        {
            ClearCanvas();
            if (state == null) return;
            var root = Panel(canvas.transform, Navy);
            Stretch(root);
            var content = Panel(root.transform, Navy);
            Stretch(content, 28, 28, 24, 24);
            Vertical(content, 12);
            Text(content.transform, "NASSAU", 26, Gold, TextAnchor.MiddleCenter);

            var opponent = state.Players.First(player => player.Id != "human");
            var header = Row(content.transform, 8);
            Text(header.transform, "🧑‍🌾\n" + opponent.DisplayName + "\nPrestígio " + opponent.Prestige + " · 👥 " + opponent.Crew + "\nCartas: " + opponent.Goods.Count, 16, Paper, TextAnchor.MiddleCenter);
            Text(header.transform, "TURNO " + state.Turn + "\n" + (state.CurrentPlayerId == "human" ? "SEU TURNO" : "A MARÉ ESTÁ PENSANDO..."), 15, Gold, TextAnchor.MiddleCenter);

            Text(content.transform, "PORTO DE NASSAU", 18, Paper, TextAnchor.MiddleCenter);
            var portRow = Row(content.transform, 8);
            foreach (var item in state.Port)
            {
                if (item.IsCrew)
                {
                    if (state.Port.Any(candidate => candidate.IsCrew) && state.Port.First(candidate => candidate.IsCrew).Id == item.Id)
                        Tile(portRow.transform, "👥\nTripulação x" + state.Port.Count(candidate => candidate.IsCrew), selectedPortIds.Contains(item.Id), () => ToggleCrew());
                }
                else
                {
                    var captured = item;
                    Tile(portRow.transform, Goods.Info[item.Type].Icon + "\n" + Goods.Info[item.Type].Label, selectedPortIds.Contains(item.Id), () => TogglePort(captured));
                }
            }

            Text(content.transform, "SEU INVENTÁRIO (PRIVADO)", 18, Paper, TextAnchor.MiddleCenter);
            var inventory = Row(content.transform, 8);
            var human = state.Players.First(player => player.Id == "human");
            foreach (var type in Goods.Order)
                foreach (var item in human.Goods.Where(candidate => candidate.Type == type))
                {
                    var captured = item;
                    Tile(inventory.transform, Goods.Info[item.Type].Icon + "\n" + Goods.Info[item.Type].Label, selectedGoodIds.Contains(item.Id), () => ToggleGood(captured));
                }
            Text(content.transform, "Cargas: " + human.Goods.Count + "/7 · 👥 " + human.Crew + " · Prestígio: " + human.Prestige, 14, Paper, TextAnchor.MiddleCenter);

            var actions = Row(content.transform, 10);
            ActionButton(actions.transform, "PEGAR", new Color32(32, 137, 95, 255), CanTake(), Take);
            ActionButton(actions.transform, "TROCAR", new Color32(32, 104, 150, 255), CanTrade(), Trade);
            ActionButton(actions.transform, "VENDER", new Color32(155, 63, 69, 255), CanSell(), BeginSell);
            Text(content.transform, "Trilhas esgotadas: " + state.Values.Count(pair => pair.Value.Count == 0) + "/3", 13, new Color32(145, 182, 182, 255), TextAnchor.MiddleCenter);

            if (showSellModal) RenderSellModal(root.transform);
            if (state.Finished) RenderResult(root.transform);
            if (state.CurrentPlayerId == "computer" && !aiThinking && !state.Finished) StartCoroutine(ComputerTurn());
        }

        private IEnumerator ComputerTurn()
        {
            aiThinking = true;
            yield return new WaitForSeconds(0.65f);
            try
            {
                var action = NassauAi.ChooseHard(state);
                if (action != null) state = NassauEngine.Apply(state, action);
            }
            catch (Exception error) { Debug.LogError(error); }
            aiThinking = false;
            RenderGame();
        }

        private void TogglePort(NassauItem item)
        {
            if (state.CurrentPlayerId != "human" || state.Finished) return;
            if (selectedPortIds.Contains(item.Id)) selectedPortIds.Remove(item.Id); else selectedPortIds.Add(item.Id);
            RenderGame();
        }

        private void ToggleCrew()
        {
            var crewIds = state.Port.Where(item => item.IsCrew).Select(item => item.Id).ToList();
            if (crewIds.All(id => selectedPortIds.Contains(id))) selectedPortIds.RemoveAll(id => crewIds.Contains(id));
            else { selectedPortIds.RemoveAll(id => !crewIds.Contains(id)); selectedPortIds.AddRange(crewIds); }
            selectedGoodIds.Clear();
            RenderGame();
        }

        private void ToggleGood(NassauItem item)
        {
            if (state.CurrentPlayerId != "human" || state.Finished) return;
            if (selectedGoodIds.Contains(item.Id)) selectedGoodIds.Remove(item.Id); else selectedGoodIds.Add(item.Id);
            RenderGame();
        }

        private bool CanTake()
        {
            if (state.CurrentPlayerId != "human" || selectedGoodIds.Count > 0) return false;
            var selected = state.Port.Where(item => selectedPortIds.Contains(item.Id)).ToList();
            return selected.Count == 1 && !selected[0].IsCrew || selected.Count > 0 && selected.All(item => item.IsCrew);
        }

        private bool CanTrade()
        {
            if (state.CurrentPlayerId != "human") return false;
            var port = state.Port.Where(item => selectedPortIds.Contains(item.Id) && !item.IsCrew).ToList();
            var goods = state.Players.First(player => player.Id == "human").Goods.Where(item => selectedGoodIds.Contains(item.Id)).ToList();
            var types = new HashSet<GoodType>(port.Select(item => item.Type));
            var compatible = goods.Where(item => !types.Contains(item.Type)).ToList();
            var crew = port.Count - compatible.Count;
            return port.Count > 0 && selectedPortIds.Count == port.Count && crew >= 0 && crew <= state.Players.First(player => player.Id == "human").Crew && state.Players.First(player => player.Id == "human").Goods.Count - compatible.Count + port.Count <= 7;
        }

        private bool CanSell()
        {
            if (state.CurrentPlayerId != "human" || selectedPortIds.Count > 0 || selectedGoodIds.Count == 0) return false;
            var goods = state.Players.First(player => player.Id == "human").Goods.Where(item => selectedGoodIds.Contains(item.Id)).ToList();
            return goods.Count > 0 && goods.Select(item => item.Type).Distinct().Count() == 1 && goods.Count >= Goods.Info[goods[0].Type].Minimum;
        }

        private void Take()
        {
            var selected = state.Port.Where(item => selectedPortIds.Contains(item.Id)).ToList();
            var action = selected.All(item => item.IsCrew)
                ? new NassauAction { Type = NassauActionType.RecruitCrew, PlayerId = "human" }
                : new NassauAction { Type = NassauActionType.TakeGood, PlayerId = "human", ItemId = selected[0].Id };
            ApplyHuman(action);
        }

        private void Trade()
        {
            var port = state.Port.Where(item => selectedPortIds.Contains(item.Id) && !item.IsCrew).ToList();
            var human = state.Players.First(player => player.Id == "human");
            var types = new HashSet<GoodType>(port.Select(item => item.Type));
            var given = human.Goods.Where(item => selectedGoodIds.Contains(item.Id) && !types.Contains(item.Type)).ToList();
            ApplyHuman(new NassauAction { Type = NassauActionType.Trade, PlayerId = "human", TakeItemIds = port.Select(item => item.Id).ToList(), GiveGoodIds = given.Select(item => item.Id).ToList(), GiveCrewCount = port.Count - given.Count });
        }

        private void BeginSell() { showSellModal = true; RenderGame(); }

        private void ConfirmSell()
        {
            var human = state.Players.First(player => player.Id == "human");
            var goods = human.Goods.Where(item => selectedGoodIds.Contains(item.Id)).ToList();
            ApplyHuman(new NassauAction { Type = NassauActionType.Sell, PlayerId = "human", GoodType = goods[0].Type, Quantity = goods.Count });
            showSellModal = false;
        }

        private void ApplyHuman(NassauAction action)
        {
            try { state = NassauEngine.Apply(state, action); selectedPortIds.Clear(); selectedGoodIds.Clear(); RenderGame(); }
            catch (Exception error) { Debug.LogError(error); }
        }

        private void RenderSellModal(Transform parent)
        {
            var modal = Panel(parent, Paper);
            Stretch(modal, 80, 80, 100, 100);
            var human = state.Players.First(player => player.Id == "human");
            var goods = human.Goods.Where(item => selectedGoodIds.Contains(item.Id)).ToList();
            var type = goods[0].Type;
            var reward = state.Values[type].Take(goods.Count).Sum();
            Vertical(modal, 12);
            Text(modal.transform, "VENDER " + goods.Count + " " + Goods.Info[type].Label.ToUpperInvariant(), 20, Navy, TextAnchor.MiddleCenter);
            Text(modal.transform, "Mercadorias: " + string.Join(" + ", state.Values[type].Take(goods.Count)) + "\nTOTAL: +" + reward + " Prestígio", 15, Navy, TextAnchor.MiddleCenter);
            var row = Row(modal.transform, 8);
            ActionButton(row.transform, "CONFIRMAR", new Color32(155, 63, 69, 255), true, ConfirmSell);
            ActionButton(row.transform, "CANCELAR", new Color32(90, 100, 100, 255), true, () => { showSellModal = false; RenderGame(); });
        }

        private void RenderResult(Transform parent)
        {
            var result = Panel(parent, Paper);
            Stretch(result, 80, 80, 100, 100);
            Vertical(result, 15);
            Text(result.transform, "FIM DA PARTIDA", 28, Navy, TextAnchor.MiddleCenter);
            Text(result.transform, state.Result.Draw ? "Empate" : "Vencedor: " + (state.Result.WinnerId == "computer" ? "A Maré" : "Você"), 20, Navy, TextAnchor.MiddleCenter);
        }

        private void EnsureCamera()
        {
            if (Camera.main != null) return;
            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.AddComponent<Camera>();
        }

        private void CreateCanvas()
        {
            var canvasObject = new GameObject("Nassau Canvas");
            canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasObject.GetComponent<CanvasScaler>().referenceResolution = new Vector2(1280, 800);
            canvasObject.AddComponent<GraphicRaycaster>();
            var eventSystem = new GameObject("EventSystem");
            eventSystem.AddComponent<EventSystem>();
            eventSystem.AddComponent<StandaloneInputModule>();
        }

        private void ClearCanvas()
        {
            for (var index = canvas.transform.childCount - 1; index >= 0; index--) Destroy(canvas.transform.GetChild(index).gameObject);
        }

        private GameObject Panel(Transform parent, Color color)
        {
            var panel = new GameObject("Panel");
            panel.transform.SetParent(parent, false);
            panel.AddComponent<Image>().color = color;
            return panel;
        }

        private GameObject Text(Transform parent, string value, int size, Color color, TextAnchor alignment)
        {
            var objectText = new GameObject("Text");
            objectText.transform.SetParent(parent, false);
            var text = objectText.AddComponent<Text>();
            text.text = value; text.font = font; text.fontSize = size; text.color = color; text.alignment = alignment; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow;
            LayoutElement(objectText).preferredHeight = size * 2.2f;
            return objectText;
        }

        private void Tile(Transform parent, string label, bool selected, Action clicked)
        {
            var button = ActionButton(parent, label, selected ? Gold : Teal, true, clicked);
            LayoutElement(button.gameObject).preferredWidth = 155;
            LayoutElement(button.gameObject).preferredHeight = 125;
        }

        private Button ActionButton(Transform parent, string label, Color color, bool enabled, Action clicked)
        {
            var objectButton = new GameObject(label);
            objectButton.transform.SetParent(parent, false);
            var image = objectButton.AddComponent<Image>(); image.color = color;
            var button = objectButton.AddComponent<Button>(); button.interactable = enabled; button.onClick.AddListener(() => clicked());
            var text = Text(objectButton.transform, label, 15, Color.white, TextAnchor.MiddleCenter);
            Stretch(text.GetComponent<RectTransform>());
            LayoutElement(objectButton).preferredWidth = 180;
            LayoutElement(objectButton).preferredHeight = 48;
            return button;
        }

        private static LayoutElement LayoutElement(GameObject objectToSize) => objectToSize.GetComponent<LayoutElement>() ?? objectToSize.AddComponent<LayoutElement>();
        private static void Vertical(GameObject objectToLayout, float spacing) { var layout = objectToLayout.AddComponent<VerticalLayoutGroup>(); layout.spacing = spacing; layout.childControlWidth = true; layout.childControlHeight = false; layout.childForceExpandWidth = true; }
        private static GameObject Row(Transform parent, float spacing) { var row = new GameObject("Row"); row.transform.SetParent(parent, false); var layout = row.AddComponent<HorizontalLayoutGroup>(); layout.spacing = spacing; layout.childControlWidth = false; layout.childControlHeight = true; layout.childForceExpandHeight = true; LayoutElement(row).preferredHeight = 145; return row; }
        private static void Stretch(GameObject objectToStretch, float left = 0, float right = 0, float top = 0, float bottom = 0) { Stretch(objectToStretch.GetComponent<RectTransform>(), left, right, top, bottom); }
        private static void Stretch(RectTransform rect, float left = 0, float right = 0, float top = 0, float bottom = 0) { rect.anchorMin = new Vector2(0, 0); rect.anchorMax = new Vector2(1, 1); rect.offsetMin = new Vector2(left, bottom); rect.offsetMax = new Vector2(-right, -top); }
    }
}
